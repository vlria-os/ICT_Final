import json
import os
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="AI Schedule Service", version="1.0.0")


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


# ─── 로컬 실행 ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aiSchedule:app", host="0.0.0.0", port=8000, reload=True)
