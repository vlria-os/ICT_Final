from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from graph.state import ChatbotState

llm=ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

ANSWER_SYSTEM_PROMPT="""
너는 병원 정보 챗봇의 최종 응답 생성기다.

너의 역할은 state에 들어 있는 정책 판정 결과, PDF 조회 결과, DB 조회 결과를 바탕으로 사용자에게 보여줄 최종 답변을 한국어로 작성하는 것이다.

[반드시 지켜야 할 규칙]
1. 현재 질문만 기준으로 답변한다. 대화 문맥은 저장되지 않는다.
2. allowed_status가 BLOCKED이면 block_reason을 바탕으로 답변하고, 비공개 정보에 대한 대안 질문은 제안하지 않는다.
3. allowed_status가 NEEDS_CLARIFICATION이면 질문이 구체적이지 않아 답변할 수 없다고 설명하고, 더 정확하게 다시 질문해 달라고 말한다.
4. PDF 결과와 DB 결과가 모두 있으면 둘을 자연스럽게 합쳐 답변한다.
5. 답변은 과장하지 말고, 주어진 데이터 안에서만 작성한다.
6. 조회 결과가 비어 있거나 실패했으면 모른다고 꾸며내지 말고, 확인 가능한 정보가 부족하다고 말한다.
7. 개인정보, 민감정보, 비공개 정보는 절대 추론하거나 생성하지 않는다.
8. 답변은 자연스럽고 간결한 한국어 문장으로 작성한다.
9. 불필요한 장황한 설명은 피한다.
""".strip()

def answer_node(state: ChatbotState) -> ChatbotState:
    final_answer=state.get("final_answer")
    allowed_status=state.get("allowed_status")
    block_reason=state.get("block_reason")
    
    if allowed_status == "BLOCKED":
        return {
            "answer": block_reason or "해당 질문에는 답변할 수 없습니다."
        }
        
    if allowed_status == "NEEDS_CLARIFICATION":
        return {
            "answer": block_reason or "질문이 구체적이지 않아 답변할 수 없습니다. 다시 질문해 주세요."
        }
        
    if final_answer:
        return {
            "answer": final_answer
        }
        
    user_question=state.get("normalized_question") or state.get("user_question", "")
    pdf_result=state.get("pdf_result")
    db_result=state.get("db_result")
    query_type=state.get("query_type")
    source_type=state.get("source_type")
    extracted_entities=state.get("extracted_entities", {})
    warnings=state.get("warnings", [])
    
    pdf_summary=None
    pdf_documents=[]
    if pdf_result:
        pdf_summary=pdf_result.get("summary")
        pdf_documents=pdf_result.get("documents", [])
        
    db_summary=None
    db_data={}
    if db_result:
        db_summary=db_result.get("summary")
        db_data=db_result.get("data", {})
        
    schedule_notice=None
    
    if query_type in ["DOCTOR_SCHEDULE", "RESERVATION_STATUS"] and db_data:
        schedule_published=db_data.get("schedulePublished")
        if schedule_published is False:
            schedule_notice="다만 해당 날짜의 의료진 스케쥴이 아직 등록되지 않아 예상 기준으로 안내된 내용일 수 있습니다. 정확한 일정 및 예약 가능 여부는 병원에 직접 문의해 주세요."
        
    if source_type == "PDF" and (not pdf_result or not pdf_result.get("success")):
        return {
            "answer": "관련 병원 규정 또는 이용 안내 정보를 확인할 수 없어 답변하기 어렵습니다."
        }

    if source_type == "DB" and (not db_result or not db_result.get("success")):
        return {
            "answer": "공개 가능한 병원 운영 정보를 확인할 수 없어 답변하기 어렵습니다."
        }
        
    if source_type == "BOTH":
        pdf_failed=(not pdf_result or not pdf_result.get("success"))
        db_failed=(not db_result or not db_result.get("success"))
        
        if pdf_failed and db_failed:
            return {
                "answer": "관련 규정과 운영 정보를 모두 확인할 수 없어 답변하기 어렵습니다."
            }
            
    context_lines=[
        f"사용자 질문: {user_question}",
        f"질문 유형: {query_type}",
        f"소스 유형: {source_type}",
        f"추출 정보: {extracted_entities}",
        f"경고: {warnings}",
        "",
        f"PDF 요약: {pdf_summary}",
        f"DB 요약: {db_summary}",
        f"DB 데이터: {db_data}"
    ]
    
    if pdf_documents:
        top_docs=pdf_documents[:3]
        for idx, doc in enumerate(top_docs, start=1):
            context_lines.append(
                f"PDF 문서 {idx}: {doc.get('page_content','')}"
            )
            context_lines.append(
                f"PDF 문서 {idx} 메타데이터: {doc.get('metadata', {})}"
            )
            
    context_text="\n".join(context_lines)
    
    try:
        response=llm.invoke(
            [
                SystemMessage(content=ANSWER_SYSTEM_PROMPT),
                HumanMessage(content=context_text)
            ]
        )
        
        final_answer=str(response.content).strip()
        
        if schedule_notice:
            final_answer=f"{final_answer}\n\n{schedule_notice}"
        
        return {
            "answer": final_answer
        }
        
    except Exception as e:
        return {
            "answer": "답변을 생성하는 중에 오류가 발생했습니다.",
            "error": f"answer_node_error: {str(e)}"
        }