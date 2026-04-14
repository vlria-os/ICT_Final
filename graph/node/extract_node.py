from typing import List, Literal, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import ChatbotState

class EntityExtractionResult(BaseModel):
    department: Optional[str] = Field(
        default=None,
        description="질문에 포함된 진료과명"
    )
    
    doctor_name: Optional[str] = Field(
        default=None,
        description="질문에 포함된 의사 이름"
    )
    
    date_text: Optional[str] = Field(
        default=None,
        description="사용자가 질문에서 사용한 원래 날짜 표현"
    )
    
    question_keywords: List[str] = Field(
        default_factory=list,
        description="질문의 핵심 키워드 목록"
    )
    
    extraction_confidence: float = Field(
        description="0.0~1.0 사이의 추출 신뢰도"
    )
    
    extraction_status: Literal["SUCCESS", "PARTIAL", "NONE"] = Field(
        description="엔티티 추출 결과 상태"
    )
    
llm=ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

structured_llm=llm.with_structured_output(EntityExtractionResult)

EXTRACT_SYSTEM_PROMPT="""
너는 병원 챗봇의 질문 정보 추출기다.

너의 역할은 사용자 질문에서 아래 정보를 구조화해서 추출하는 것이다.

[추출 대상]
1. department
- 진료과 이름
- 예: 내과, 정형외과, 산부인과, 신경과, 피부과

2. doctor_name
- 공개 가능한 의사 이름 표현
- 예: John, Kim, Chloe, 김철수, 김영희, 홍길동

3. date_text
- 사용자가 질문에 직접 쓴 날짜 표현
- 예: 오늘, 내일, 모레, 이번 주, 다음 주 금요일, 9월 20일, 세 달 뒤

4. question_keywords
- 질문 의미를 대표하는 핵심 키워드 목록
- 너무 많지 않게 3~7개 정도로 반환

[중요 규칙]
1. 현재 질문만 기준으로 추출한다.
2. 없는 정보는 억지로 만들지 말고 null 또는 빈 리스트로 반환한다.
3. 날짜를 실제 날짜로 변환하지 말고, 질문에 등장한 표현 그대로 date_text에 넣는다.
4. 진료과나 의사 이름이 불명확하면 추측하지 말고 null로 둔다.
5. question_keywords에는 질문 의미를 나타내는 핵심어만 넣는다.
6. 출력은 반드시 구조화된 값만 반환한다.

[추출 상태 규칙]
- SUCCESS: 필요한 핵심 정보가 비교적 명확하게 추출됨
- PARTIAL: 일부만 추출됨
- NONE: 추출 가능한 핵심 정보가 거의 없음
""".strip()

def extract_node(state: ChatbotState) -> ChatbotState:
    normalized_question=state.get("normalized_question") or state.get("user_question", "")
    normalized_question=normalized_question.strip()
    
    if not normalized_question:
        return {
            "extracted_entities": {
                "department": None,
                "doctor_name": None,
                "date_text": None,
                "question_keywords": []
            },
            "warnings": ["extract_node_empty_question"]
        }
        
    try:
        decision=structured_llm.invoke(
            [
                SystemMessage(content=EXTRACT_SYSTEM_PROMPT),
                HumanMessage(content=f"사용자 질문: {normalized_question}")
            ]
        )
        
        extracted_entities={
            "department": decision.department,
            "doctor_name": decision.doctor_name,
            "date_text": decision.date_text,
            "question_keywords": decision.question_keywords
        }
        
        if state.get("resolved_date"):
            extracted_entities["exact_date"]=state.get("resolved_date")
            
        if state.get("resolved_date_range"):
            extracted_entities["date_range"]=state.get("resolved_date_range")
            
        result: ChatbotState={
            "extracted_entities": extracted_entities
        }
        
        if decision.extraction_status in ["PARTIAL", "NONE"]:
            existing_warnings=state.get("warnings", [])
            result["warnings"]=[
                *existing_warnings,
                f"extract_node_{decision.extraction_status.lower()}"
            ]
            
        return result
    
    except Exception as e:
        existing_warnings=state.get("warnings", [])
        
        return {
            "extracted_entities": {
                "department": None,
                "doctor_name": None,
                "date_text": None,
                "question_keywords": []
            },
            "warnings": [
                *existing_warnings,
                "extract_node_error"
            ],
            "error": f"extract_node_error: {str(e)}"
        }
