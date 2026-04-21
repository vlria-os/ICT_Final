import os
import uuid
from typing import Any, Dict, List

from pypdf import PdfReader
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

class PdfIngestService:
    def __init__(
        self,
        persist_directory: str = "./chroma",
        collection_name: str = "hospital_pdf_docs",
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ) -> None:
        self.persist_directory=persist_directory
        self.collection_name=collection_name
        self.chunk_size=chunk_size
        self.chunk_overlap=chunk_overlap
        
        self.embeddings=OpenAIEmbeddings()
        self.vectorstore=Chroma(
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        self.text_splitter=RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
    def ingest_pdf(self, file_path: str, uploaded_by: str="admin") -> Dict[str, Any]:
        file_name=os.path.basename(file_path)
        
        if not os.path.exists(file_path):
            return {
                "success": False,
                "message": "PDF 파일 경로가 존재하지 않습니다.",
                "file_name": file_name,
                "document_count": 0,
            }
            
        try:
            raw_pages=self._extract_text_from_pdf(file_path)
            
            if not raw_pages:
                return {
                    "success": False,
                    "message": "PDF에서 추출된 텍스트가 없습니다.",
                    "file_name": file_name,
                    "document_count": 0,
                }
                
            #같은 file_name으로 저장된 기존 벡터 삭제
            self._delete_existing_file(file_name)
            
            chunked_documents=self._build_chunked_documents(
                raw_pages=raw_pages,
                file_path=file_path,
                uploaded_by=uploaded_by
            )
            
            if not chunked_documents:
                return {
                    "success": False,
                    "message": "PDF를 chunk로 분할하지 못했습니다.",
                    "file_name": file_name,
                    "document_count": 0,
                }
                
            ids=[str(uuid.uuid4()) for _ in chunked_documents]
            texts=[doc["page_content"] for doc in chunked_documents]
            metadatas=[doc["metadata"] for doc in chunked_documents]
            
            self.vectorstore.add_texts(
                texts=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            return {
                "success": True,
                "message": "PDF 임베딩 및 저장이 완료되었습니다.",
                "file_name": file_name,
                "document_count": len(chunked_documents),
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"PDF 저장 중 오류가 발생했습니다: {str(e)}",
                "file_name": file_name,
                "document_count": 0,
            }
            
    def _delete_existing_file(self, file_name: str) -> None:
        self.vectorstore.delete(
            where={"file_name": file_name}
        )
        
    def _extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        reader=PdfReader(file_path)
        pages: List[Dict[str, Any]] = []
        
        for index, page in enumerate(reader.pages):
            text=page.extract_text() or ""
            cleaned_text=text.strip()
            
            if cleaned_text:
                pages.append(
                    {
                        "page_number": index + 1,
                        "text": cleaned_text
                    }
                )
                
        return pages
    
    def _build_chunked_documents(
        self,
        raw_pages: List[Dict[str, Any]],
        file_path: str,
        uploaded_by: str
    ) -> List[Dict[str, Any]]:
        file_name=os.path.basename(file_path)
        chunked_documents: List[Dict[str, Any]] = []
        
        for page in raw_pages:
            page_number=page["page_number"]
            page_text=page["text"]
            
            split_texts=self.text_splitter.split_text(page_text)
            
            for chunk_index, chunk_text in enumerate(split_texts):
                cleaned_chunk=chunk_text.strip()
                
                if not cleaned_chunk:
                    continue
                
                chunked_documents.append(
                    {
                        "page_content": cleaned_chunk,
                        "metadata":{
                            "file_name":file_name,
                            "page_number":page_number,
                            "chunk_index":chunk_index,
                            "uploaded_by":uploaded_by,
                            "source":"hospital_pdf"
                        }
                    }
                )
        
        return chunked_documents