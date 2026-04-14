from graph.state import ChatbotState
from service.spring_api_service import SpringApiService

spring_api_service=SpringApiService()

def db_node(state: ChatbotState) -> ChatbotState:
    source_type=state.get("source_type")
    query_type=state.get("query_type")
    extracted_entities=state.get("extracted_entities", {})
    
    department=extracted_entities.get("department")
    resolved_date=state.get("resolved_date")
    resolved_date_range=state.get("resolved_date_range")
    
    if source_type not in ["DB", "BOTH"]:
        return {
            "db_result": None
        }
        
    if not department:
        return {
            "db_result": {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": None
            },
            "allowed_status": "NEEDS_CLARIFICATION",
            "block_type": "INSUFFICIENT_INFO",
            "block_reason": "진료과 정보가 구체적이지 않아 답변할 수 없습니다. 진료과를 포함해 다시 질문해 주세요."
        }
        
    if query_type == "RESERVATION_STATUS":
        result = spring_api_service.get_public_reservation_status(
            department=department,
            exact_date=resolved_date,
            date_range=resolved_date_range
        )
        
        return {
            "db_result": result
        }
        
    if query_type == "DOCTOR_INFO":
        result = spring_api_service.get_public_doctor_info(
            department=department,
            exact_date=resolved_date
        )
        
        return {
            "db_result": result
        }
        
    if query_type == "DEPARTMENT_INFO":
        result = spring_api_service.get_public_department_info(
            department=department
        )
        
        return {
            "db_result": result
        }
        
    if query_type == "MIXED":
        result = spring_api_service.get_public_reservation_status(
            department=department,
            exact_date=resolved_date,
            date_range=resolved_date_range
        )
        
        return {
            "db_result": result
        }
        
    return {
        "db_result": {
            "success": False,
            "data": {},
            "summary": None,
            "queried_endpoint": None
        },
        "error": f"db_node_error: 지원하지 않는 query_type 입니다. ({query_type})"
    }