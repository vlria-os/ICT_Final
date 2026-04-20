import React, { useEffect, useRef, useState } from 'react'
import { openAttachmentArchive } from '../../../api/chatApi';
import dayjs from 'dayjs';

const getAttachmentType=(file)=>{
    const contentType=file.contentType || "";
    const ext=(file.fileExtension || "").toLowerCase();

    if(contentType.startsWith("image/")) return "image";
    if(contentType.startsWith("video/")) return "video";
    if(contentType === "application/pdf") return "pdf";

    if (
        ext === "xls" ||
        ext === "xlsx" ||
        contentType.includes("spreadsheet") ||
        contentType.includes("excel")
    ) {
        return "excel";
    }

    if (
        ext === "doc" ||
        ext === "docx" ||
        contentType.includes("word")
    ) {
        return "word";
    }

    if (
        ext === "ppt" ||
        ext === "pptx" ||
        contentType.includes("presentation") ||
        contentType.includes("powerpoint")
    ) {
        return "ppt";
    }

    return "file";
}

const AttachmentItem=({file}) => {
    const fileType=getAttachmentType(file);

    const getFileIcon=()=>{
        if (fileType === "pdf") return "📄";
        if (fileType === "excel") return "📊";
        if (fileType === "video") return "🎥";
        if (fileType === "word") return "📝";
        if (fileType === "ppt") return "📽️";
        return "📎";
    }

    return (
        <div className={`attachment-card ${fileType}`}>
            {fileType === "image" ? (
                <a
                    href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer">
                            <img 
                                src={file.fileUrl}
                                alt={file.originalFileName}
                                className='attachment-file-image'/>
                </a>
            ) : (
                <div className='attachment-file-box'>
                    <div className='attachment-icon'>{getFileIcon()}</div>
                    <div className='attachment-file-info'>
                        <a href={file.fileUrl}
                            target='_blank' rel='noreferrer'
                            className='attachment-name'>
                            {file.originalFileName}
                        </a>
                        <p className='attachment-file-label'>
                            {fileType.toUpperCase()}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const AttachmentArchive = ({roomId, roomName, setAttachmentArchive}) => {
  const [attachmentSlice, setAttachmentSlice]=useState({
      attachments:[],
      hasNext:false,
      nextCursor:null
    });
  const [loadingOld, setLoadingOld]=useState(false);
  
  const attachmentAreaRef=useRef(null);
  
  useEffect(()=>{
    if(!roomId){
        setAttachmentSlice({
            attachments:[],
            hasNext:false,
            nextCursor:null
        });
        return;
    }

    const getAttachmentSlice=async()=>{
        try{
            const data=await openAttachmentArchive({
                roomId: roomId,
                cursor: null
            });

            setAttachmentSlice({
                attachments: data.slice.attachments,
                hasNext: data.slice.hasNext,
                nextCursor: data.slice.nextCursor
            });

            if(attachmentAreaRef.current){
                attachmentAreaRef.current.scrollTop = 0;
            }
        }catch(error){
            console.log(error);
        }
    }

    getAttachmentSlice();
  },[roomId]);

  const loadingOlderAttachments=async()=>{
    if(loadingOld || !attachmentSlice.hasNext) return;

    setLoadingOld(true);

    try{
        const data=await openAttachmentArchive({
            roomId: roomId,
            cursor: attachmentSlice.nextCursor
        });

        setAttachmentSlice(prev => ({
            attachments:[...prev.attachments, ...data.slice.attachments],
            hasNext:data.slice.hasNext,
            nextCursor:data.slice.nextCursor
        }));
    } catch(error){
        console.log(error);
    } finally {
        setLoadingOld(false);
    }
  };

  const handleScroll=()=>{
    const container=attachmentAreaRef.current;
    if(!container || loadingOld || !attachmentSlice.hasNext) return;

    const nearBottom=container.scrollHeight - container.scrollTop - container.clientHeight <= 80;

    if(nearBottom){
        loadingOlderAttachments();
    }
  }

  const groupAttachmentsByDate=(attachments)=>{
    const grouped=attachments.reduce((acc, file)=>{
        const date=dayjs(file.createdAt).format("YYYY-MM-DD");

        if(!acc[date]){
            acc[date]=[];
        }

        acc[date].push(file);
        return acc;
    }, {});

    return Object.entries(grouped)
        .sort((a, b) => dayjs(b[0]).valueOf() - dayjs(a[0]).valueOf())
        .map(([date, files]) => ({
            date,
            files:files.sort(
                (a, b)=> dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
            )
        }));
  };

  const groupedAttachments=groupAttachmentsByDate(attachmentSlice.attachments);

  return (
    <div className='chat-attachment-archive-panel'>
        <div className='chat-attachment-archive-header'>
            <div className='chat-attachment-archive-room-name'>
                <p>{roomName}</p>
            </div>
            <div className='chat-attachment-archive-close-area'>
                <button type='button' className='chat-attachment-archive-close-btn'
                    onClick={()=>setAttachmentArchive(false)}>
                    닫기
                </button>
            </div>
        </div>
        <div className='chat-attachment-archive-main' ref={attachmentAreaRef}
            onScroll={handleScroll}>
            {
                groupedAttachments.map((group)=>(
                    <div className='chat-attachment-archive-item' key={group.date}>
                        <div className='chat-attachment-item-date'>
                            {dayjs(group.date).format("YYYY년 M월 D일")}
                        </div>
                        <div className='chat-attachment-files'>
                            {
                                group.files.map((file)=>(
                                    <AttachmentItem key={file.attachmentId}
                                        file={file}/>
                                ))
                            }
                        </div>
                    </div>
                ))
            }
        </div>
    </div>
  )
}

export default AttachmentArchive