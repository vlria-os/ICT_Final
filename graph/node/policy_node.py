from typing import Literal

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from graph.state import ChatbotState

class PolicyDecision(BaseModel):
    allowed_status: Literal["ALLOWED", "BLOCKED", "NEEDS_CLARIFICATION"]=Field(
        description="질문이 허용 가능한지 여부"
    )
    
    block_type: Literal[
        "NONE",
        "PERSONAL_INFO",
        "SENSITIVE_INFO",
        "PRIVATE_OPERATION_INFO",
        "UNSUPPORTED_REQUEST",
    ] = Field(
        description="차단 또는 제한 사유 유형"
    )
    
    block_reason: str = Field(
        description="사용자에게 보여줄 차단 또는 판단 이유"
    )
    
    policy_confidence: float = Field(
        description="0.0~1.0 사이의 정책 판단 신뢰도"
    )
    
llm=ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

structured_llm=llm.with_structured_output(PolicyDecision)

POLICY_SYSTEM_PROMPT="""
너는 병원 정보 챗봇의 정책 판정기다.

너의 역할은 사용자 질문이 아래 정책에 따라 허용 가능한지 판정하는 것이다.

────────────────
[핵심 원칙]

1. 특정 개인(환자)을 식별할 수 있는 정보가 포함되거나, 특정 개인의 예약/진료/검사/처방 내역을 조회하려는 경우에만 차단한다.
2. "예약"이라는 단어가 포함되었다는 이유만으로 차단하지 않는다.
3. 진료과 단위의 예약 가능 여부, 예약 현황, 운영 정보는 공개 가능한 정보로 간주하고 허용한다.
4. 특정 의사의 공개 가능한 진료 일정, 공개 가능한 진료 가능 여부는 허용한다.
5. 반드시 현재 질문 한 개만 기준으로 판정한다. 대화 문맥은 없다.

────────────────
[챗봇 정책]

1. 챗봇은 병원 규정, 이용 수칙, 공개 가능한 병원 운영 정보에 대해 답변할 수 있다.

2. 아래 정보는 공개 가능한 정보로 간주하고 허용한다:
- 진료과 예약 가능 여부
- 진료과별 예약 현황
- 특정 날짜의 예약 가능 인원
- 특정 의사의 공개 가능한 진료 일정
- 특정 의사의 공개 가능한 진료 가능 여부
- 진료과 및 부서 운영 정보
- 병원 이용 절차 및 안내

3. 아래 정보는 개인정보로 간주하여 반드시 차단한다:
- 환자 이름, 환자 번호, 주민등록번호, 연락처 등 개인 식별 정보
- 특정 환자의 예약 내역
- 특정 환자의 진료 기록
- 특정 환자의 검사 결과
- 특정 환자의 처방 정보

4. 아래 정보는 비공개 정보로 간주하여 차단한다:
- 의사의 사적 일정
- 직원 개인 연락처
- 내부 DB 정보
- 관리자 권한, 로그인 정보, 비밀번호 등 시스템 보안 정보

5. 질문이 너무 모호해서 무엇을 묻는지 판단하기 어려우면 NEEDS_CLARIFICATION으로 판정한다.

────────────────
[매우 중요한 판별 규칙]

아래 규칙을 반드시 지켜라.

1. "예약할 수 있어?", "예약 가능해?", "예약 현황 알려줘"는 공개 가능한 운영 질문이다.
2. "내일 내과 예약할 수 있어?", "이번 주 정형외과 예약 가능해?" 같은 질문은 특정 개인 정보 요청이 아니므로 반드시 ALLOWED다.
3. "내 예약 확인해줘", "홍길동 환자 예약 내역 보여줘", "누구 예약돼 있어?"는 특정 개인의 기존 예약 내역 조회이므로 BLOCKED다.
4. "예약"이라는 단어가 있어도, 특정 개인의 기존 예약 내역을 조회하는 것이 아니면 차단하지 마라.
5. "내 예약", "내 접수 내역", "내 검사 결과", "홍길동 환자 예약"처럼 특정 개인의 정보 조회 의도가 분명할 때만 개인정보/민감정보로 차단한다.
6. "예약할 수 있어?"는 "예약이 가능한지"를 묻는 공개 질문이지, 특정 개인의 예약 내역 조회가 아니다.
7. 모호하면 차단하지 말고 NEEDS_CLARIFICATION을 사용하라.

────────────────
[예시]

✔ 허용 (ALLOWED)
- 내일 내과 진료 예약할 수 있어?
- 4월 20일에 내과 예약 가능해?
- 이번 주 정형외과 예약 현황 알려줘
- 소아과 예약 가능 여부 알려줘
- 김민수 의사 내일 진료 가능해?
- 내과 의사 누구 있어?
- 병원 운영 시간이 어떻게 돼?

✔ 차단 (BLOCKED)
- 내 예약 확인해줘
- 홍길동 환자 예약돼 있어?
- 김철수 환자의 진료 기록 알려줘
- 특정 환자의 검사 결과 보여줘
- 내 처방 내역 알려줘

✔ 모호 (NEEDS_CLARIFICATION)
- 예약 가능해?
- 진료 가능해?
- 의사 일정 알려줘

────────────────
[판정 기준]

- 공개 가능한 병원 운영 정보 → ALLOWED
- 공개 가능한 진료과 예약 가능 여부/예약 현황 → ALLOWED
- 공개 가능한 특정 의사 일정/진료 가능 여부 → ALLOWED
- 특정 개인의 예약/진료/검사/처방 정보 → BLOCKED
- 비공개 운영 정보 → BLOCKED
- 질문이 지나치게 모호함 → NEEDS_CLARIFICATION

────────────────
[block_type 규칙]

- 허용 질문이면 반드시 block_type은 "NONE"
- 환자 식별 정보, 특정 개인 정보 요청이면 "PERSONAL_INFO"
- 진료기록, 검사결과, 처방내역 등 민감정보면 "SENSITIVE_INFO"
- 의사 개인 일정, 직원 개인 연락처, 비공개 운영 정보면 "PRIVATE_OPERATION_INFO"
- 챗봇 목적 밖 요청이나 지원 불가 요청이면 "UNSUPPORTED_REQUEST"

────────────────
[출력 규칙]

- 반드시 구조화된 값만 반환한다.
- allowed_status가 ALLOWED이면 block_reason은 "허용 가능한 공개 정보 질문입니다."처럼 짧게 작성한다.
- allowed_status가 BLOCKED이면 block_reason은 사용자에게 보여줄 자연스러운 한국어 한 문장으로 작성한다.
- allowed_status가 NEEDS_CLARIFICATION이면 block_reason은 "질문이 구체적이지 않아 답변할 수 없습니다. 다시 정확하게 질문해 주세요."처럼 작성한다.
- policy_confidence는 0.0~1.0 사이 숫자로 반환한다.
""".strip()

def policy_node(state: ChatbotState) -> ChatbotState:
    question=state.get("user_question", "").strip()
    
    if not question:
        return {
            "normalized_question":"",
            "allowed_status":"NEEDS_CLARIFICATION",
            "block_type":"UNSUPPORTED_REQUEST",
            "block_reason":"질문이 비어 있어 답변할 수 없습니다. 다시 정확하게 질문해 주세요.",
            "policy_confidence":1.0,
            "policy_raw_response":{
                "reason":"empty_question"
            },
        }
        
    normalized_question=" ".join(question.split())
    
    try:
        decision = structured_llm.invoke(
            [
                SystemMessage(content=POLICY_SYSTEM_PROMPT),
                HumanMessage(content=f"사용자 질문: {normalized_question}")
            ]
        )
        
        return {
            "normalized_question":normalized_question,
            "allowed_status":decision.allowed_status,
            "block_type": decision.block_type,
            "block_reason": decision.block_reason,
            "policy_confidence": decision.policy_confidence,
            "policy_raw_response": decision.model_dump(),
        }
        
    except Exception as e:
        return{
            "normalized_question": normalized_question,
            "allowed_status": "BLOCKED",
            "block_type": "UNSUPPORTED_REQUEST",
            "block_reason": "질문을 처리하는 중 정책 판정 오류가 발생했습니다.",
            "policy_confidence": 0.0,
            "policy_raw_response": {
                "error": str(e)
            },
            "error": f"policy_node_error: {str(e)}",
        }

    