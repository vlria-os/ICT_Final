from typing import Any, Dict, List, Literal, Optional, TypedDict

AllowedStatus=Literal["ALLOWED", "BLOCKED", "NEEDS_CLARIFICATION"]
BlockType=Literal[
    "NONE",
    "PERSONAL_INFO",
    "SENSITIVE_INFO",
    "PRIVATE_OPERATION_INFO",
    "UNSUPPORTED_REQUEST",
    "INSUFFICIENT_INFO",
    "PAST_DATE"
]
SourceType=Literal["PDF", "DB", "BOTH", "NONE"]
QueryType=Literal[
    "RULE",
    "USAGE_GUIDE",
    "RESERVATION_STATUS",
    "DOCTOR_INFO",
    "DOCTOR_SCHEDULE",
    "DEPARTMENT_INFO",
    "DEPARTMENT_LIST",
    "MIXED",
    "UNKNOWN",
]

class DateRange(TypedDict, total=False):
    start_date: str
    end_date: str
    
class ExtractedEntities(TypedDict, total=False):
    department: Optional[str]
    doctor_name: Optional[str]
    date_text: Optional[str]
    exact_date: Optional[str]
    date_range: Optional[DateRange]
    question_keywords: List[str]
    
class PdfSearchResult(TypedDict, total=False):
    success: bool
    documents: List[Dict[str, Any]]
    summary: Optional[str]
    source_count: int
    
class DbSearchResult(TypedDict, total=False):
    success: bool
    data: Dict[str, Any]
    summary: Optional[str]
    queried_endpoint: Optional[str]
    
class ChatbotState(TypedDict, total=False):
    #원본 입력
    user_question: str
    
    #질문 전처리/분석
    normalized_question: Optional[str]
    query_type: QueryType
    extracted_entities: ExtractedEntities
    
    #정책/보안 판단
    allowed_status: AllowedStatus
    block_type: BlockType
    block_reason: Optional[str]
    policy_confidence: Optional[float]
    policy_raw_response: Optional[Dict[str, Any]]
    
    #날짜 해석
    has_date_expression: bool
    resolved_date: Optional[str]
    resolved_date_range: Optional[DateRange]
    current_datetime: Optional[str]
    timezone:Optional[str]
    
    #라우팅 결과
    source_type: SourceType
    
    #조회 결과
    pdf_result: Optional[PdfSearchResult]
    db_result: Optional[DbSearchResult]
    
    #처리 상태/오류
    error: Optional[str]
    warnings: List[str]
    
    #최종 출력
    final_answer: Optional[str]
    answer: Optional[str]