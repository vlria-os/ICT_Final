import os
import asyncio
import uuid

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from graph.graph_builder import graph
from service.pdf_ingest_service import PdfIngestService
from pydantic import BaseModel

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

pdf_ingest_service=PdfIngestService()

class ChatRequest(BaseModel):
    question: str

@app.get("/chatbot/health")
def health_check():
    return {"status":"ok"}

@app.post("/chatbot/chat")
async def chat(payload: ChatRequest):
    user_question=payload.question.strip()
    
    if not user_question:
        raise HTTPException(status_code=400, detail="question 값이 필요합니다.")
    
    current_datetime=datetime.now(ZoneInfo("Asia/Seoul")).isoformat()
    
    initial_state={
        "user_question": user_question,
        "current_datetime": current_datetime,
        "timezone": "Asia/Seoul",
        "warnings": []
    }
    
    try:
        result=await asyncio.to_thread(graph.invoke, initial_state)
        
        return {
            "question": user_question,
            "answer": result.get("answer"),
            "allowed_status": result.get("allowed_status"),
            "block_type": result.get("block_type"),
            "block_reason": result.get("block_reason"),
            "query_type": result.get("query_type"),
            "source_type": result.get("source_type"),
            "warnings": result.get("warnings", []),
            "error": result.get("error"),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 처리 중에 오류가 발생했습니다. {str(e)}")
    
    
@app.post("/chatbot/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 할 수 있습니다.")
    
    upload_dir="uploaded_pdfs"
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_filename=f"{uuid.uuid4()}_{file.filename}"
    
    file_path=os.path.join(upload_dir, unique_filename)
    
    try:
        file_bytes=await file.read()
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        result=pdf_ingest_service.ingest_pdf(
            file_path=file_path,
            uploaded_by="admin"
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("message"))
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 업로드 중에 오류가 발생했습니다. {str(e)}")