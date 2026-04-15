import os
from typing import Any, Dict, Optional

import requests

class SpringApiService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int=10
    ) -> None:
        self.base_url=(base_url or os.getenv("SPRING_API_BASE_URL","")).rstrip("/")
        self.api_key=api_key or os.getenv("SPRING_INTERNAL_API_KEY")
        self.timeout=timeout
        
        self.session=requests.Session()
        
        default_headers: Dict[str, str] = {
            "Accept": "application/json"
        }
        
        if self.api_key:
            default_headers["X-Internal-API-Key"]=self.api_key
            
        self.session.headers.update(default_headers)
        
    def get_public_reservation_status(
        self,
        department: str,
        exact_date: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        endpoint=f"{self.base_url}/chatbot/inquiry/reservation"
        
        params: Dict[str, Any] = {
            "department": department
        }
        
        if exact_date:
            params["date"]=exact_date
            
        if date_range:
            params["startDate"]=date_range.get("start_date")
            params["endDate"]=date_range.get("end_date")
            
        try:
            response=self.session.get(
                endpoint,
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            payload=response.json()
            
            return {
                "success": True,
                "data": payload,
                "summary": self._build_reservation_summary(payload),
                "queried_endpoint": "/chatbot/inquiry/reservation"
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/reservation",
                "error": f"spring_api_request_error: {str(e)}"
            }
            
        except ValueError as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/reservation",
                "error": f"spring_api_json_error: {str(e)}"
            }
            
    def get_public_doctor_info(
        self,
        department: str
    ) -> Dict[str, Any]:
        endpoint=f"{self.base_url}/chatbot/inquiry/doctor"
        
        params: Dict[str, Any] = {
            "department": department
        }
            
        try:
            response=self.session.get(
                endpoint,
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            payload=response.json()
            
            return {
                "success": True,
                "data": payload,
                "summary": self._build_doctor_summary(payload),
                "queried_endpoint": "/chatbot/inquiry/doctor"
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/doctor",
                "error": f"spring_api_request_error: {str(e)}",
            }
            
        except ValueError as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/doctor",
                "error": f"spring_api_json_error: {str(e)}",
            }
            
    def get_public_doctor_schedule(
        self,
        doctor_name: str,
        department: str,
        exact_date: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        endpoint=f"{self.base_url}/chatbot/inquiry/doctor/schedule"
        
        params: Dict[str, Any] = {
            "doctorName": doctor_name,
            "department": department
        }
        
        if exact_date:
            params["date"]=exact_date
            
        if date_range:
            params["startDate"]=date_range.get("start_date")
            params["endDate"]=date_range.get("end_date")
            
        try:
            response=self.session.get(
                endpoint,
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            payload=response.json()
            
            return {
                "success": True,
                "data": payload,
                "summary": self._build_doctor_schedule_summary(payload),
                "queried_endpoint": "/chatbot/inquiry/doctor/schedule"
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/doctor/schedule",
                "error": f"spring_api_request_error: {str(e)}"
            }
        except ValueError as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/doctor/schedule",
                "error": f"spring_api_json_error: {str(e)}"
            }

            
    def get_public_department_info(
        self,
        department: str
    ) -> Dict[str, Any]:
        endpoint=f"{self.base_url}/chatbot/inquiry/department"
        
        params: Dict[str, Any] = {
            "department": department
        }
        
        try:
            response=self.session.get(
                endpoint,
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            payload=response.json()
            
            return {
                "success": True,
                "data": payload,
                "summary": self._build_department_summary(payload),
                "queried_endpoint": "/chatbot/inquiry/department",
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/department",
                "error": f"spring_api_request_error: {str(e)}",
            }
            
        except ValueError as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/department",
                "error": f"spring_api_json_error: {str(e)}",
            }
            
    def get_public_department_list(self) -> Dict[str, Any]:
        endpoint=f"{self.base_url}/chatbot/inquiry/department/list"
        
        try:
            response=self.session.get(
                endpoint,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            payload=response.json()
            
            return {
                "success": True,
                "data": payload,
                "summary": self._build_department_list_summary(payload),
                "queried_endpoint": "/chatbot/inquiry/department/list"
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/department/list",
                "error": f"spring_api_request_error: {str(e)}"
            }
        except ValueError as e:
            return {
                "success": False,
                "data": {},
                "summary": None,
                "queried_endpoint": "/chatbot/inquiry/department/list",
                "error": f"spring_api_json_error: {str(e)}"
            }
            
    def _build_reservation_summary(self, payload: Dict[str, Any]) -> Optional[str]:
        if not payload:
            return None
        
        department=payload.get("department")
        date=payload.get("date")
        start_date=payload.get("startDate")
        end_date=payload.get("endDate")
        total_count=payload.get("totalCount")
        available_count=payload.get("availableCount")
        
        parts=[]
        
        if department:
            parts.append(f"진료과: {department}")
            
        if date:
            parts.append(f"기준 날짜: {date}")
            
        if start_date and end_date:
            parts.append(f"조회 기간: {start_date}~{end_date}")
            
        if total_count is not None:
            parts.append(f"전체 예약 수: {total_count}")
            
        if available_count is not None:
            parts.append(f"예약 가능 수: {available_count}")
            
        return ", ".join(parts) if parts else None
    
    def _build_doctor_summary(self, payload: Dict[str, Any]) -> Optional[str]:
        if not payload:
            return None
        
        department=payload.get("department")
        doctors=payload.get("doctors", [])
        
        if department and isinstance(doctors, list):
            return f"{department}의 공개 가능한 의사 정보 {len(doctors)}건을 조회했습니다."
        
        return None
    
    def _build_doctor_schedule_summary(self, payload: Dict[str, Any]) -> Optional[str]:
        if not payload:
            return None

        doctor_name = payload.get("doctorName")
        department = payload.get("department")
        date = payload.get("date")
        start_date = payload.get("startDate")
        end_date = payload.get("endDate")
        available = payload.get("available")
        schedules = payload.get("schedules", [])

        parts = []

        if department:
            parts.append(f"진료과: {department}")

        if doctor_name:
            parts.append(f"의사명: {doctor_name}")

        if date:
            parts.append(f"기준 날짜: {date}")

        if start_date and end_date:
            parts.append(f"조회 기간: {start_date} ~ {end_date}")

        if available is not None:
            parts.append(f"진료 가능 여부: {'가능' if available else '불가'}")

        if isinstance(schedules, list):
            parts.append(f"공개 일정 수: {len(schedules)}건")

        return ", ".join(parts) if parts else None
    
    def _build_department_summary(self, payload: Dict[str, Any]) -> Optional[str]:
        if not payload:
            return None
        
        department=payload.get("department")
        location=payload.get("location")
        
        if department and location:
            return f"{department} 정보가 조회되었습니다."
        
        if department:
            return f"{department} 정보가 조회되었습니다."
        
        return None
    
    def _build_department_list_summary(self, payload: Dict[str, Any]) -> Optional[str]:
        if not payload:
            return None

        departments = payload.get("departments", [])

        if isinstance(departments, list):
            return f"병원의 공개 가능한 진료과 목록 {len(departments)}건을 조회했습니다."

        return None