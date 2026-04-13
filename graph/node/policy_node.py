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

[챗봇 정책]
1. 챗봇은 병원 규정, 이용 수칙, 공개 가능한 병원 운영 정보에 대해서만 답변할 수 있다.
2. 챗봇은 특정 진료과의 공개 가능한 예약 현황, 공개 가능한 의사 정보, 공개 가능한 부서 운영 정보에 대해서만 답변할 수 있다.
3. 환자 번호, 환자 이름, 주민등록번호, 연락처 등 특정 개인을 식별할 수 있는 정보를 이용한 질문은 허용되지 않는다.
4. 특정 환자의 예약 내역, 진료 정보, 검사 결과, 처방 정보 등 개인정보 또는 민감 정보는 허용되지 않는다.
5. 특정 의사의 개인 일정, 개인 연락처 등 비공개 정보는 허용되지 않는다.
6. 로그인 정보, 비밀번호, 관리자 권한, DB 접속 정보 등 챗봇 목적과 무관하거나 지원하지 않는 요청은 허용되지 않는다.
7. 질문이 너무 모호해서 이 질문만으로는 답변할 수 없으면 NEEDS_CLARIFICATION으로 판정한다.
8. 대화 문맥은 저장되지 않는다. 반드시 현재 질문 한 개만 기준으로 판정한다.
9. 비공개 정보 질문에는 대안 질문을 제안하지 말고, 왜 답변할 수 없는지만 설명한다.

[판정 기준]
- 공개 가능한 병원 규정, 이용 안내, 과별 공개 운영 정보, 과별 예약 현황, 과별 의사 이름, 과별 의사 근무 정보: ALLOWED
- 개인정보 또는 민감 정보: BLOCKED
- 비공개 운영 정보 또는 챗봇 범위를 벗어난 요청: BLOCKED
- 질문이 지나치게 모호하거나 핵심 정보가 부족함: NEEDS_CLARIFICATION

[block_type 규칙]
- 허용 질문이면 반드시 block_type은 "NONE"
- 환자 식별 정보, 특정 개인 정보 요청이면 "PERSONAL_INFO"
- 진료기록, 검사결과, 처방내역 등 민감정보면 "SENSITIVE_INFO"
- 의사 개인 일정, 직원 개인 연락처, 비공개 운영 정보면 "PRIVATE_OPERATION_INFO"
- 챗봇 목적 밖 요청이나 지원 불가 요청이면 "UNSUPPORTED_REQUEST"

[출력 규칙]
- 반드시 구조화된 값만 반환한다.
- allowed_status가 ALLOWED이면 block_reason은 짧게 "허용 가능한 공개 정보 질문입니다."처럼 작성한다.
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

    