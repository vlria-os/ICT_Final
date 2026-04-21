from pydantic import BaseModel
from typing import List, Dict
import requests
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
load_dotenv()

import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langchain.agents import create_agent
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from langchain_core.prompts import ChatPromptTemplate

import asyncio
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, File, HTTPException, UploadFile, Header
from graph.graph_builder import graph
from service.pdf_ingest_service import PdfIngestService


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],       # 필요시 특정 도메인만 허용 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB 연결 ---

HOST = os.environ.get("HOST")
USERNAME = os.environ.get("USER_NAME")
PASSWORD = os.environ.get("PASSWORD")
DB = os.environ.get("DB")

DB_URL = f"mysql+pymysql://{USERNAME}:{PASSWORD}@{HOST}:3306/{DB}"
engine = create_engine(DB_URL)

# --- 스프링 API base ---
SPRING_BASE_URL = "http://localhost:8080/api/llm/record"

#------------------------------------------------------------------------
# --- OpenAI API ---
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0, openai_api_key=openai_api_key)

# --- 데이터 모델 ---
class DiagnoseRequest(BaseModel):
    patientId: int
    departmentId: int
    departmentName: str
    symptom: str

# --- 진료 기록 조회 ---    
def get_medical_records(patient_id: int, department_id: int, token: str):
    """
    스프링 API 호출해서 해당 환자, 과 진료 기록 받아오기
    """
    resp = requests.get(
        f"{SPRING_BASE_URL}",
        params={"patientId": patient_id, "departmentId": department_id},
        headers={"Authorization": token}
    )
    resp.raise_for_status()  # 에러 시 예외 발생
    return resp.json()  # 리스트 of dict

def get_department_map():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT department_id, department_name FROM department"))
        return {row[0]: row[1] for row in result}

# --- 툴 정의: 과 목록 조회 ---
@tool
def get_departments_tool():
    """DB에서 모든 진료과 목록 반환 (ID + 이름 포함)"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT department_id, department_name FROM department"))
        departments = [{"id": row[0], "name": row[1]} for row in result]
    return json.dumps(departments)  # JSON 문자열로 반환

# --- LLM + Agent 생성 ---
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

agent = create_agent(
    llm,
    tools=[get_departments_tool]
)

# --- FastAPI 엔드포인트 ---
@app.post("/diagnose")
def diagnose(req: DiagnoseRequest, authorization: str = Header(None)):
    token = authorization
    
    # 현재 과 진료 기록 조회
    current_records = get_medical_records(req.patientId, req.departmentId, token)
    print(current_records)

    # LLM에게 현재 기록과 증상 전달
    record_summary = "\n\n".join([
    f"""### Case {idx+1}
Symptom: {item['diagnosis']['symptom']}
Diagnosis: {item['diagnosis']['content']}

Records:
{chr(10).join([f"- {rec['type']}: {rec['content']}" for rec in item['records']])}
"""
    for idx, item in enumerate(current_records)
])
    user_message = f"""
Patient has symptom: "{req.symptom}"
Current department ({req.departmentName}) 
records: {record_summary}

Decide if additional department records are needed.
If yes, call the 'get_departments' tool to see all departments, 
then select 2 most relevant departments with their 'id'.
Select the 2 most relevant departments based on:
- user query relevance
- department description similarity
Return ONLY a JSON array of department IDs.
Example format:
[<id1>, <id2>]
Do NOT include names.
Do NOT reuse example values.
Do NOT hardcode any department IDs.
Return only the selected departments as a JSON array.
"""

    response = agent.invoke({"messages": [("user", user_message)]})
    messages = response["messages"]

    # 🔥 1. 최종 AI 응답 찾기
    final_message = None
    for msg in reversed(messages):
        if msg.__class__.__name__ == "AIMessage" and msg.content:
            final_message = msg.content
            break

    print("FINAL:", final_message)
    print("RAW LLM:", response)

    # 🔥 2. JSON 파싱
    parsed = []
    if final_message:
        try:
            match = re.search(r"```json\s*(.*?)\s*```", final_message, re.DOTALL)
            
            if match:
                json_str = match.group(1)
            else:
                # fallback: 그냥 전체에서 [] 찾기
                match = re.search(r"\[.*\]", final_message, re.DOTALL)
                json_str = match.group(0) if match else "[]"

            parsed = json.loads(json_str)
            
            dept_map = get_department_map()

            selected_departments = [
                {"id": dept_id, "name": dept_map.get(dept_id)}
                for dept_id in parsed
            ]

        except Exception as e:
            print("JSON 파싱 실패:", e)
            print("문제 응답:", final_message)

    # 🔥 3. 추가 기록 조회
    additional_records = []
    for dept in selected_departments:
        dept_id = dept["id"]
        recs = get_medical_records(req.patientId, dept_id, token)
        additional_records.extend(recs)

    print("user_message:", user_message)
    print("selected_departments:", parsed)
    
    #------------------RAG
    
    all_records = current_records + additional_records
    query = f"{req.symptom} {req.departmentName}"
    
    if not all_records:
        retrieved_text = ""
    else:
        vector_store = build_vector_store(all_records)
        docs = vector_store.similarity_search(query, k=3)
        retrieved_text = "\n\n".join([doc.page_content for doc in docs])

    final_prompt = f"""
    환자 증상:
    {req.symptom}

    현재 진료 기록:
    {record_summary}

    유사 사례:
    {retrieved_text}

    위 정보를 기반으로:
    1. 가능성 높은 질병 1~3개
    2. 각 질병의 근거
    3. 추가로 필요한 검사 또는 진료과

    를 한국어로 설명해라
    
    단,
    - 진료과는 자연어로 설명만 작성할 것
    - 절대 "진료과 ID", "추천 진료과", "📌" 형식 사용 금지
    """

    final_response = llm.invoke(final_prompt)
    
    print("AI DIAGNOSIS:", final_response.content)

    return {
        "agent_response": parsed,
        "current_department_records": current_records,
        "additional_records": additional_records,
        "ai_diagnosis": final_response.content  
    }

    #------------------------------------------------
embedding = OpenAIEmbeddings()
vector_store = None

def build_vector_store(records):
    texts = []

    for item in records:
        diagnosis = item["diagnosis"]
        recs = item["records"]

        record_text = "\n".join([
            f"{r['type']}: {r['content']}" for r in recs
        ])

        text = f"""
        증상: {diagnosis['symptom']}
        진단: {diagnosis['content']}
        기록:
        {record_text}
        """

        texts.append(text)

    return FAISS.from_texts(texts, embedding)


##############################[지원님 코드 시작]##############################

pdf_ingest_service=PdfIngestService()

class ChatRequest(BaseModel):
    question: str

@app.get("/chatbot/health")
def health_check():
    return {"status":"ok"}

@app.post("/chatbot/chat")
async def chat(payload: ChatRequest):
    user_question=payload.question.strip()
    
    if not user_question:
        raise HTTPException(status_code=400, detail="question 값이 필요합니다.")
    
    current_datetime=datetime.now(ZoneInfo("Asia/Seoul")).isoformat()
    
    initial_state={
        "user_question": user_question,
        "current_datetime": current_datetime,
        "timezone": "Asia/Seoul",
        "warnings": []
    }
    
    try:
        result=await asyncio.to_thread(graph.invoke, initial_state)
        
        return {
            "question": user_question,
            "answer": result.get("answer"),
            "allowed_status": result.get("allowed_status"),
            "block_type": result.get("block_type"),
            "block_reason": result.get("block_reason"),
            "query_type": result.get("query_type"),
            "source_type": result.get("source_type"),
            "warnings": result.get("warnings", []),
            "error": result.get("error"),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 처리 중에 오류가 발생했습니다. {str(e)}")
    
    
@app.post("/chatbot/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 할 수 있습니다.")
    
    upload_dir="uploaded_pdfs"
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_filename=f"{uuid.uuid4()}_{file.filename}"
    
    file_path=os.path.join(upload_dir, unique_filename)
    
    try:
        file_bytes=await file.read()
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        result=pdf_ingest_service.ingest_pdf(
            file_path=file_path,
            uploaded_by="admin"
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("message"))
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 업로드 중에 오류가 발생했습니다. {str(e)}")
    

##############################[가연님 코드 시작]##############################


    # 입력 Pydantic (Java DTO와 동일한 구조)

class AiManualConditionDto(BaseModel):
    staffId: Optional[int] = None
    staffName: Optional[str] = None
    workDate: Optional[str] = None   # "YYYY-MM-DD"
    type: Optional[str] = None       # 예: "VACATION", "OFF", "FIXED_SHIFT"
    mode: Optional[str] = None       # 예: "DAY", "EVENING", "NIGHT"


class AiScheduleInputDto(BaseModel):
    departmentId: Optional[int] = None
    departmentName: Optional[str] = None
    jobType: Optional[str] = None

    startDate: Optional[date] = None
    endDate: Optional[date] = None

    shiftTypes: Optional[List[str]] = None           # 예: ["DAY", "EVENING", "NIGHT"]
    minStaffMap: Optional[Dict[str, int]] = None     # 예: {"DAY": 3, "EVENING": 2, "NIGHT": 2}

    staffList: Optional[List[Dict[str, Any]]] = None
    manualConditionList: Optional[List[AiManualConditionDto]] = None
    rules: Optional[List[str]] = None


#  출력 Pydantic (with_structured_output 스키마) 

class ScheduleEntry(BaseModel):
    staffId: int
    staffName: str
    workDate: str    # "YYYY-MM-DD"
    shiftType: str   # 근무 타입 또는 "OFF"


class ScheduleOutput(BaseModel):
    scheduleList: List[ScheduleEntry]


# 프롬프트 빌더 

def build_prompt_text(data: AiScheduleInputDto) -> str:
    # 날짜범위
    date_range: List[str] = []
    if data.startDate and data.endDate:
        cur = data.startDate
        while cur <= data.endDate:
            date_range.append(cur.isoformat())
            cur += timedelta(days=1)

    if data.staffList:
        staff_lines = "".join(f"{s}\n" for s in data.staffList)
    else:
        staff_lines = "(없음)\n"

    manual_lines = (
        "".join(
            f"staffId={m.staffId}, staffName={m.staffName}, "
            f"workDate={m.workDate}, type={m.type}, mode={m.mode}\n"
            for m in data.manualConditionList
        )
        if data.manualConditionList else "(없음)\n"
    )

    rules_lines = "".join(f"{r}\n" for r in data.rules) if data.rules else "(없음)\n"
# 딕셔너리 -> 문자열, ensure_ascii=False : 한글유지
    min_staff_text = json.dumps(data.minStaffMap, ensure_ascii=False) if data.minStaffMap else "{}"
    shift_types_text = ", ".join(data.shiftTypes) if data.shiftTypes else ""

    return f"""당신은 병원 근무 스케줄 전문 AI입니다.
아래 정보를 바탕으로 직원들의 근무 스케줄을 생성하세요.

[부서 정보]
- 부서 ID: {data.departmentId}
- 부서명: {data.departmentName}
- 직종: {data.jobType}

[스케줄 기간]
- 시작일: {data.startDate}
- 종료일: {data.endDate}
- 날짜 목록: {date_range}

[근무 유형]
- 근무 타입: {shift_types_text}
- 근무 타입별 최소 인원: {min_staff_text}

[직원 목록]
{staff_lines}
[수동 조건 (고정 근무/휴가/특정 근무 지정)]
{manual_lines}
[규칙]
{rules_lines}
규칙 준수 사항:
1. 모든 직원은 기간 내 매일 반드시 하나의 shiftType 또는 "OFF"를 가져야 합니다.
2. 수동 조건(manualConditionList)이 있으면 반드시 우선 적용하세요.
3. 각 근무 타입별 최소 인원(minStaffMap)을 매일 충족해야 합니다.
4. rules 항목을 최대한 준수하세요."""


# 스케줄 생성 엔드포인트 

@app.post("/ai/schedule", response_model=ScheduleOutput)
async def generate_schedule(input_data: AiScheduleInputDto):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY가 설정되지 않았습니다.")

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.2,
            api_key=api_key,
        )

        
        # LLM이 반드시 해당 형식으로만 응답하도록 강제
        structured_llm = llm.with_structured_output(ScheduleOutput)

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "당신은 병원 근무 스케줄 전문 AI입니다."),
            ("human", "{user_prompt}"),
        ])

        chain = prompt_template | structured_llm

        prompt_text = build_prompt_text(input_data)
        result: ScheduleOutput = await chain.ainvoke({"user_prompt": prompt_text})

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

