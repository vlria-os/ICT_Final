import React, { useEffect, useRef, useState } from 'react'
import "./InquiryChatbot.css"

export const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_BASE_URL;

const InquiryChatBotPage = () => {
  const [question, setQuestion]=useState("");
  const [messages, setMessages]=useState([]);
  const [openPdfModal, setOpenPdfModal]=useState(false);
  const [selectedPdf, setSelectedPdf]=useState(null);
  const [askLoading, setAskLoading]=useState(false);
  const [uploadLoading, setUploadLoading]=useState(false);

  const messageAreaRef=useRef(null);

  const roles=sessionStorage.getItem("roles") || "";
  const isAdmin=roles.includes("ADMIN");

  useEffect(()=>{
    if(messageAreaRef.current){
      messageAreaRef.current.scrollTop=messageAreaRef.current.scrollHeight;
    }
  },[messages])

  const upload=async()=>{
    if(!selectedPdf){
      alert("파일을 선택하세요");
      return;
    }

    if(uploadLoading) return;
    setUploadLoading(true);

    try{
      const formData=new FormData();
      formData.append("file", selectedPdf);

      const res=await fetch(`${API_BASE_URL}/chatbot/upload`, {
        method:'POST',
        body:formData
      });

      const data=await res.json();

      if(!res.ok){
        throw new Error(data?.detail || "PDF 업로드 실패!");
      }

      if(data.success){
        alert(data.message || "PDF 업로드 성공!");
        setSelectedPdf(null);
        setOpenPdfModal(false);
      } else {
        alert(data.message || "PDF 업로드 실패");
      }
    }catch(error){
      console.log(error);
      alert(error.message || "PDF 업로드 중 오류가 발생했습니다.");
    }finally{
      setUploadLoading(false);
    }
  }

  const ask=async()=>{
    const trimmedQuestion=question.trim();

    if(!trimmedQuestion) {
      alert("질문을 입력하세요.");
      return;
    }

    if(askLoading) return;
    setAskLoading(true);

    const userMessage={
      role:'USER',
      content:trimmedQuestion
    };

    setMessages(prev => [...prev, userMessage]);

    setQuestion("");

    try{
      const res=await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method:'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: trimmedQuestion
        })
      });

      const data=await res.json();

      if(!res.ok){
        throw new Error(data?.detail || "문의 요청 실패!");
      }

      const aiText=data?.answer || data?.block_reason || data?.error || "답변을 가져오지 못했습니다.";

      const aiMessage={
        role:'AI',
        content:aiText
      };

      setMessages(prev => [...prev, aiMessage]);

    }catch(error){
      console.log(error);

      const errorMessage={
        role:'AI',
        content: error.message || "오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      };

      setMessages(prev => [...prev, errorMessage]);
    }finally{
      setAskLoading(false);
    }
  };

  return (
    <div className='inquiry-chatbot-wrap'>
      <div className='inquiry-chatbot-header'>
        <div className='inquiry-chatbot-name'>
          <p>병원 문의 AI 챗봇</p>
        </div>
        {
          isAdmin && (
            <div className='inquiry-chatbot-admin-area'>
              <button type='button' className='inquiry-chatbot-pdf-update-btn'
                onClick={()=>setOpenPdfModal(true)}>PDF 수정</button>
            </div>
          )
        }
      </div>
      <div className='inquiry-chatbot-body' ref={messageAreaRef}>
        {
          messages.length === 0 ? (
            <div className='inquiry-chatbot-empty'>
              병원 이용 규정, 운영 시간, 접수 및 예약 관련 내용을 질문해보세요.
            </div>
          ) : (
            messages.map((msg, index)=>(
              <div key={`message-` + index}
                className={msg.role === 'USER' ? "user-message":"ai-message"}>
                  {msg.content}
              </div>
            ))
          )
        }
      </div>
      <div className='inquiry-chatbot-footer'>
        <div className='inquiry-chatbot-form-wrap'>
          <form className='inquiry-chatbot-form'
            onSubmit={(e)=>{
              e.preventDefault();
              ask();
            }}>
            <input type='text' placeholder='AI 챗봇에게 질문해보세요.' value={question}
                onChange={(e)=>setQuestion(e.target.value)} className='inquiry-chatbot-question-input'/>
            <button type='submit' className='inquiry-chatbot-submit-btn'>전송</button>
          </form>
        </div>
      </div>
      {
        openPdfModal && (
          <div className='pdf-modal-overlay' onClick={()=>{
            if(!uploadLoading) setOpenPdfModal(false)
          }}>
            <div className='pdf-modal-inner' onClick={(e)=>e.stopPropagation()}>
              <form onSubmit={(e)=>{
                e.preventDefault();
                upload();
              }}>
                <div className='inquiry-chatbot-pdf-input-wrap'>
                  <input type='file' accept='application/pdf'
                    onChange={(e)=>setSelectedPdf(e.target.files[0])}/>
                </div>
                <div className='inquiry-chatbot-pdf-button-wrap'>
                  <button type='button' onClick={()=>{
                    setSelectedPdf(null);
                    setOpenPdfModal(false);
                  }} className='pdf-modal-close-btn'>
                    취소
                  </button>
                  <button type='submit' className='pdf-upload-btn'>확인</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default InquiryChatBotPage