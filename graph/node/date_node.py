from typing import Literal, Optional
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import ChatbotState

class DateResolution(BaseModel):
    has_date_expression: bool = Field(
        description="질문에 날짜 관련 표현이 포함되어 있는지 여부"
    )
    
    resolution_type: Literal["NONE", "EXACT_DATE", "DATE_RANGE", "AMBIGUOUS"] = Field(
        description="날짜 해석 결과 유형"
    )
    
    resolved_date: Optional[str] = Field(
        default=None,
        description="단일 날짜 해석 결과. YYYY-MM-DD 형식"
    )
    
    start_date: Optional[str] = Field(
        default=None,
        description="날짜 범위 시작일. YYYY-MM-DD 형식"
    )
    
    end_date: Optional[str] = Field(
        default=None,
        description="날짜 범위 종료일. YYYY-MM-DD 형식"
    )
    
    reason: str = Field(
        description="날짜 해석 이유 또는 판단 설명"
    )
    
llm=ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

structured_llm=llm.with_structured_output(DateResolution)

def _is_past_date(date_str:str, current_datetime:str) -> bool:
    current_date=datetime.fromisoformat(current_datetime).date()
    target_date=datetime.fromisoformat(date_str).date()
    
    return target_date < current_date

DATE_SYSTEM_PROMPT="""
너는 병원 챗봇의 날짜 해석가다.

너의 역할은 사용자 질문 안의 날짜 표현을 현재 기준 시각을 바탕으로 해석하는 것이다.

[규칙]
1. 질문에 날짜 표현이 없으면 has_date_expression은 false, resolution_type은 "NONE"으로 반환한다.
2. 질문에 날짜 표현이 있으면 현재 기준 시각을 바탕으로 실제 날짜로 변환한다.
3. 단일 날짜면 resolution_type은 "EXACT_DATE"로 반환하고 resolved_date에 YYYY-MM-DD 형식으로 넣는다.
4. 기간 표현이면 resolution_type은 "DATE_RANGE"로 반환하고 start_date, end_date를 YYYY-MM-DD 형식으로 넣는다.
5. 질문의 날짜 표현이 모호해서 현재 질문만으로 정확히 특정할 수 없으면 resolution_type은 "AMBIGUOUS"로 반환한다.
6. 날짜가 모호하면 추측하지 말고 AMBIGUOUS로 반환한다.
7. 대화 문맥은 저장되지 않는다. 반드시 현재 질문 한 개만 기준으로 해석한다.
8. 출력은 반드시 구조화된 값만 반환한다.

[예시]
- "오늘 정형외과 예약 현황 알려줘" -> EXACT_DATE
- "내일 소아과 가능한가?" -> EXACT_DATE
- "이번 주 내과 예약 현황 알려줘" -> DATE_RANGE
- "다음 주 금요일 외과 예약 상황" -> EXACT_DATE
- "예약 현황 알려줘" -> NONE
- "그날 예약 현황 알려줘" -> AMBIGUOUS
""".strip()

def date_node(state: ChatbotState) -> ChatbotState:
    normalized_question=state.get("normalized_question") or state.get("user_question", "")
    normalized_question=normalized_question.strip()
    
    current_datetime=state.get("current_datetime")
    timezone=state.get("timezone", "Asia/Seoul")
    
    if not normalized_question:
        return {
            "has_date_expression": False,
            "resolved_date": None,
            "resolved_date_range": None
        }
        
    if not current_datetime:
        return {
            "error":"date_node_error: current_datetime 값이 없습니다.",
            "has_date_expression": False,
            "resolved_date": None,
            "resolved_date_range": None
        }
        
    try:
        decision=structured_llm.invoke(
            [
                SystemMessage(content=DATE_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"현재 기준 시각: {current_datetime}\n"
                    f"시간대 : {timezone}\n"
                    f"사용자 질문: {normalized_question}"
                ))
            ]
        )
        
        query_type=state.get("query_type")
        
        if query_type in ["RESERVATION_STATUS", "DOCTOR_SCHEDULE"]:
            if decision.resolution_type == "EXACT_DATE" and decision.resolved_date:
                if _is_past_date(decision.resolved_date, current_datetime):
                    return {
                        "allowed_status": "BLOCKED",
                        "block_type": "PAST_DATE",
                        "block_reason": "과거 날짜에 대한 예약 및 진료 일정 정보는 제공하지 않습니다.",
                        "has_date_expression": True,
                        "resolved_date": None,
                        "resolved_date_range": None
                    }
                    
            if (decision.resolution_type == "DATE_RANGE" and decision.start_date
                and decision.end_date):
                if _is_past_date(decision.end_date, current_datetime):
                    return {
                        "allowed_status": "BLOCKED",
                        "block_type": "PAST_DATE",
                        "block_reason": "과거 기간에 대한 예약 및 진료 일정 정보는 제공하지 않습니다.",
                        "has_date_expression": True,
                        "resolved_date": None,
                        "resolved_date_range": None
                    }
        
        if decision.resolution_type=="NONE":
            return {
                "has_date_expression": False,
                "resolved_date": None,
                "resolved_date_range": None
            }
            
        if decision.resolution_type=="EXACT_DATE":
            return {
                "has_date_expression": True,
                "resolved_date": decision.resolved_date,
                "resolved_date_range": None,
            }
            
        if decision.resolution_type == "DATE_RANGE":
            return {
                "has_date_expression": True,
                "resolved_date": None,
                "resolved_date_range": {
                    "start_date": decision.start_date,
                    "end_date": decision.end_date,
                },
            }

        if decision.resolution_type == "AMBIGUOUS":
            return {
                "allowed_status": "NEEDS_CLARIFICATION",
                "block_type": "INSUFFICIENT_INFO",
                "block_reason": "질문의 날짜 정보가 구체적이지 않아 답변할 수 없습니다. 날짜를 정확하게 포함해 다시 질문해 주세요.",
                "has_date_expression": True,
                "resolved_date": None,
                "resolved_date_range": None,
            }

        return {
            "error": "date_node_error: 알 수 없는 날짜 해석 결과입니다.",
            "has_date_expression": False,
            "resolved_date": None,
            "resolved_date_range": None,
        }
        
    except Exception as e:
        return {
            "error": f"date_node_error: {str(e)}",
            "has_date_expression": False,
            "resolved_date": None,
            "resolved_date_range": None,
        }