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

────────────────
[사용 가능한 소스]

1. PDF

* 병원 규정
* 이용 수칙
* 병원 이용 안내
* 절차 설명
* 문서형 운영 기준

2. DB

* 공개 가능한 진료과 목록
* 공개 가능한 진료과 정보
* 진료과 단위 예약 현황
* 진료과 단위 예약 가능 여부
* 공개 가능한 의사 목록
* 특정 의사의 진료 일정
* 특정 의사의 날짜별 진료 가능 여부
* 특정 의사의 예약 가능 여부
* 부서 운영 정보

3. BOTH

* 문서 규정 + 실제 운영 데이터가 동시에 필요한 질문

4. NONE

* DB/PDF 조회 없이 답변 가능
* 질문이 너무 모호하거나 부족한 경우

────────────────
[핵심 구분 기준 - 매우 중요]

✔ RESERVATION_STATUS (진료과 단위)

* "진료과" 중심 질문
* 의사 이름 없음
* 예약 가능 여부 / 예약 현황 질문
  → 날짜가 있어도 무조건 RESERVATION_STATUS

✔ DOCTOR_SCHEDULE (의사 단위)

* 반드시 "특정 의사 이름" 존재
* 특정 의사의 날짜/기간 기반 진료 가능 여부
  → 의사 이름 없으면 절대 사용 금지

────────────────
[query_type 분류 기준]

* RULE
  병원 규정, 규칙, 기준

* USAGE_GUIDE
  이용 방법, 절차, 안내, 운영 시간

* RESERVATION_STATUS
  진료과 단위 예약 현황, 예약 가능 여부, 날짜별 예약 상태
  ※ 의사 이름이 없으면 반드시 이걸 사용한다

* DOCTOR_INFO
  의사 목록, 의사 정보, 의사 근무 정보

* DOCTOR_SCHEDULE
  특정 의사의 날짜별 진료 가능 여부, 예약 가능 여부
  ※ 반드시 의사 이름이 있을 때만 사용

* DEPARTMENT_INFO
  진료과 정보, 부서 운영 정보

* DEPARTMENT_LIST
  전체 진료과 목록

* MIXED
  두 가지 이상 정보 혼합

* UNKNOWN
  분류 어려움

────────────────
[강제 규칙 - 절대 위반 금지]

1. 의사 이름이 없으면 DOCTOR_SCHEDULE로 분류하지 마라.
2. 날짜가 있어도 의사 이름이 없으면 RESERVATION_STATUS다.
3. "예약 가능", "예약 돼?", "예약 현황"은 모두 RESERVATION_STATUS다.
4. DOCTOR_SCHEDULE는 오직 "특정 의사 질문"일 때만 사용한다.

────────────────
[예시 - 반드시 참고]

✔ RESERVATION_STATUS

* 4월 20일에 내과 예약할 수 있어?
* 이번 주 정형외과 예약 가능해?
* 소아과 예약 현황 알려줘

✔ DOCTOR_SCHEDULE

* 김민수 의사 4월 20일 진료 가능해?
* 박영희 교수 다음 주 일정 알려줘

✔ DOCTOR_INFO

* 내과 의사 누구 있어?

────────────────
[판단 기준]

* 규정/설명 → PDF
* 구조화 데이터 → DB
* 둘 다 필요 → BOTH
* 부족/모호 → NONE

────────────────
[출력 규칙]

* 반드시 구조화된 값만 반환한다.
* source_type, query_type, reason만 반환한다.
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