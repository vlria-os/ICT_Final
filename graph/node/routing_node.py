from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import ChatbotState

class RoutingDecision(BaseModel):
    source_type: Literal["PDF", "DB", "BOTH", "NONE"] = Field(
        description="질문에 답하기 위해 필요한 데이터 소스"
    )
    
    query_type: Literal[
        "RULE",
        "USAGE_GUIDE",
        "RESERVATION_STATUS",
        "DOCTOR_INFO",
        "DOCTOR_SCHEDULE",
        "DEPARTMENT_INFO",
        "DEPARTMENT_LIST",
        "MIXED",
        "UNKNOWN",
    ] = Field(
        description="질문의 유형 분류"
    )
    
    reason: str = Field(
        description="왜 해당 소스로 라우팅 했는지에 대한 간단한 설명"
    )
    
llm=ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

structured_llm=llm.with_structured_output(RoutingDecision)

ROUTING_SYSTEM_PROMPT="""
너는 병원 챗봇의 라우팅 판단기다.

너의 역할은 사용자 질문이 답변되기 위해 어떤 데이터 소스가 필요한지 판단하는 것이다.

[사용 가능한 소스]
1. PDF
- 병원 규정
- 이용 수칙
- 병원 이용 안내
- 절차 설명
- 문서형 운영 기준

2. DB
- 공개 가능한 진료과 목록
- 공개 가능한 진료과 정보
- 공개 가능한 진료과 예약 현황
- 공개 가능한 의사 정보
- 공개 가능한 특정 의사의 진료 일정
- 공개 가능한 특정 의사의 날짜별/기간별 진료 가능 여부
- 공개 가능한 특정 의사의 날짜별/기간별 예약 가능 여부
- 공개 가능한 부서 운영 정보
- 날짜별/과별 구조화된 운영 데이터

3. BOTH
- 문서 규정과 실제 운영 데이터가 함께 필요한 질문

4. NONE
- 현재 단계에서 PDF나 DB 조회가 필요 없는 경우
- 질문이 지나치게 일반적이어서 바로 답변할 수 없는 경우
- 질문 자체가 라우팅 불가능한 경우

[판단 기준]
- 병원 규정, 이용 수칙, 절차, 안내문 중심 질문이면 PDF
- 예약 현황, 진료과 목록, 의사 목록, 날짜별 운영 상태 같은 구조화 정보면 DB
- 특정 의사의 날짜별 진료 가능 여부, 특정 기간 공개 진료 일정은 DB
- 규정 설명과 운영 데이터가 동시에 필요하면 BOTH
- 소스 판별이 어렵고 정보가 너무 부족하면 NONE

[query_type 분류 기준]
- RULE: 병원 규정, 규칙, 기준
- USAGE_GUIDE: 이용 방법, 절차, 안내, 운영 시간
- RESERVATION_STATUS: 예약 현황, 예약 가능 여부, 날짜별 예약 상태
- DOCTOR_INFO: 의사 정보, 의사 목록, 의사 근무 정보
- DOCTOR_SCHEDULE: 특정 의사의 날짜별 진료/예약 가능 여부, 특정 기간 공개 진료 일정
- DEPARTMENT_INFO: 진료과 정보, 부서 정보, 과 운영 정보
- DEPARTMENT_LIST: 병원 전체 진료과 목록, 어떤 진료과가 있는지
- MIXED: 두 가지 이상이 섞인 질문
- UNKNOWN: 분류 어려움

[중요 규칙]
1. 대화 문맥은 저장되지 않는다. 현재 질문만 보고 판단한다.
2. 정책적으로 차단된 질문인지 여부는 이미 이전 단계에서 판정되었다고 가정한다.
3. 날짜 정보가 포함되어 있어도 날짜 해석 자체는 이미 이전 단계에서 끝났다고 가정한다.
4. 출력은 반드시 구조화된 값만 반환한다.
""".strip()


def routing_node(state: ChatbotState) -> ChatbotState:
    normalized_question=state.get("normalized_question") or state.get("user_question", "")
    normalized_question=normalized_question.strip()
    
    allowed_status=state.get("allowed_status")
    
    if not normalized_question:
        return {
            "source_type": "NONE",
            "query_type": "UNKNOWN",
            "error": "routing_node_error: 질문이 비어 있습니다.",
        }
        
    if allowed_status != "ALLOWED":
        return {
            "source_type": "NONE",
            "query_type": "UNKNOWN",
        }
        
    try:
        decision=structured_llm.invoke(
            [
                SystemMessage(content=ROUTING_SYSTEM_PROMPT),
                HumanMessage(
                    content=(
                        f"사용자 질문: {normalized_question}\n"
                        f"해석된 단일 날짜: {state.get('resolved_date')}\n"
                        f"해석된 날짜 범위: {state.get('resolved_date_range')}"
                    )
                )
            ]
        )
        
        return {
            "source_type": decision.source_type,
            "query_type": decision.query_type
        }
        
    except Exception as e:
        return {
            "source_type": "NONE",
            "query_type": "UNKNOWN",
            "error": f"routing_node_error: {str(e)}",
        }