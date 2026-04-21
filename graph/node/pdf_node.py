from graph.state import ChatbotState
from service.pdf_service import PdfSearchService

pdf_search_service=PdfSearchService()

def pdf_node(state: ChatbotState) -> ChatbotState:
    source_type=state.get("source_type")
    normalized_question=state.get("normalized_question") or state.get("user_question", "")
    normalized_question=normalized_question.strip()
    
    if source_type not in ["PDF", "BOTH"]:
        return {
            "pdf_result": None
        }
        
    if not normalized_question:
        return {
            "pdf_result": {
                "success": False,
                "documents": [],
                "summary": None,
                "source_count": 0
            },
            "error": "pdf_node_error: 질문이 비어 있습니다."
        }
        
    result=pdf_search_service.search(
        query=normalized_question,
        k=4
    )
    
    return {
        "pdf_result": result
    }