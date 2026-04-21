from typing import Any, Dict, List, Optional

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

class PdfSearchService:
    def __init__(
        self,
        persist_directory: str = "./chroma",
        collection_name: str = "hospital_pdf_docs"
    ) -> None:
        self.persist_directory=persist_directory
        self.collection_name=collection_name
        
        self.embeddings=OpenAIEmbeddings()
        self.vectorstore=Chroma(
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        
    def search(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            documents=self.vectorstore.similarity_search(
                query=query,
                k=k,
                filter=filter_dict
            )
            
            results: List[Dict[str, Any]] = []
            
            for doc in documents:
                results.append(
                    {
                        "page_content":doc.page_content,
                        "metadata":doc.metadata
                    }
                )
                
            summary=self._build_summary(results)
            
            return {
                "success": True,
                "documents": results,
                "summary": summary,
                "source_count": len(results)
            }
            
        except Exception as e:
            return {
                "success": False,
                "documents": [],
                "summary": None,
                "source_count": 0,
                "error": str(e)
            }
            
    def _build_summary(self, results: List[Dict[str, Any]]) -> Optional[str]:
        if not results:
            return None
        
        contents: List[str] = []
        
        for item in results:
            text=item.get("page_content","").strip()
            
            if text:
                contents.append(text)
                
        if not contents:
            return None
        
        joined_text="\n\n".join(contents[:3])
        return joined_text[:1500]