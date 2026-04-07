from dotenv import load_dotenv
load_dotenv()

import os
import shutil

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_chroma import Chroma
from langchain_core.runnables import RunnableLambda

app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

vectorstore=None
CHROMA_DIR="./chroma_db"

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

@app.on_event("startup")
def load_vectorstore():
    global vectorstore
    
    if os.path.exists(CHROMA_DIR):
        embeddings=OpenAIEmbeddings(model="text-embedding-3-small")
        vectorstore=Chroma(
            persist_directory=CHROMA_DIR,
            embedding_function=embeddings
        )
        print("기존 Chroma DB 로드 완료")
    else:
        print("Chroma DB 없음")

@app.post("/inquiry/chatbot/upload")
async def upload_pdf(file:UploadFile=File(...)):
    global vectorstore #전역 변수 사용 선언
    
    #첨부 파일 읽어오기
    file_path=f"temp_{file.filename}"
    contents=await file.read()
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    try:
        loader=PyPDFLoader(file_path)
        documents=loader.load()
    
        #파일에서 읽어온 텍스트 청크 단위로 쪼개기
        splitter=RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100
        )
    
        docs=splitter.split_documents(documents)
    
        #임베딩
        embeddings=OpenAIEmbeddings(model="text-embedding-3-small")
        
        if os.path.exists(CHROMA_DIR):
            shutil.rmtree(CHROMA_DIR)
    
        #벡터스토어에 저장
        vectorstore=Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=CHROMA_DIR
        )
    
        return {"result":"success"}
    finally:
        #임시 pdf 파일 삭제
        if os.path.exists(file_path):
            os.remove(file_path)

    
@app.post("/inquiry/chatbot/ask")
async def question(question:str=Form(...)):
    global vectorstore
    if vectorstore is None:
        return {"answer":"pdf 파일이 존재하지 않습니다."}
    
    llm=ChatOpenAI(model="gpt-4o-mini", temperature=0)
    
    #리트리버 생성
    retriever=vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k":4,
            "lambda_mult":0.5
        }
    )
    
    prompt=ChatPromptTemplate.from_template("""
    당신은 제공된 문서를 기반으로만 답변하는 전문 어시스턴트입니다.
    
    다음은 참고할 문서입니다.
    ------------------------------------------------------
    {content}
    ------------------------------------------------------
    
    사용자 질문
    {question}
    
    문서 기반으로만 정확히 답변하세요.
    문서에서 답을 찾을 수 없으면 "병원 이용 안내 및 운영 규정에서 해당 내용과 관련된 정보를 찾지 못했습니다. 병원으로 직접 문의해 주세요."라고 말하세요.
    추측하지 마세요.
    """)
    
    retriever_chain=RunnableMap({
        "content":retriever | RunnableLambda(format_docs),
        "question":RunnablePassthrough()
    })
    
    full_chain=retriever_chain | prompt | llm | StrOutputParser()
    result=full_chain.invoke(question)
    
    return {"answer":result}
    
    
