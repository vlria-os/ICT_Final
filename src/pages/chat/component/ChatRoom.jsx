import React, { useEffect, useRef, useState } from 'react'
import { chatRoomDetail, deleteMessage, editMessage, getStaffListForInvite, inviteStaff, leaveChatRoom, markAsRead, uploadAttachment } from '../../../api/chatApi';
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

const ReplyModal=({ handleReply, onClose, setReplyContent, parentMessage, replyContent }) => {
    return (
        <div className='replyModalOverlay' onClick={onClose}>
            <div className='replyModalInner' onClick={(e)=> e.stopPropagation()}>
                <div className='replyModal-parentMessageContent'>
                    <div className='replyModal-parentLabel-wrap'>
                        <p className='replyModal-parentLabel'>답장할 메시지</p>
                    </div>
                    {
                        parentMessage?.attachments &&
                        parentMessage?.attachments?.length > 0 && (
                            <div className='replyModal-parent-attachments'>
                                {
                                    parentMessage.attachments.map((file)=>(
                                        <AttachmentItem key={file.attachmentId}
                                            file={file}/>
                                    ))
                                }
                            </div>    
                        )
                    }
                    <div className='replyModal-parentText'>
                        <textarea value={parentMessage?.content ?? ""} 
                            rows={3} readOnly>
                        </textarea>
                    </div>
                </div>
                <div className='replyModal-form-area'>
                    <form className='replyModal-form'
                        onSubmit={(e)=>{
                            e.preventDefault();
                            handleReply();
                        }}>
                        <div className='replyModal-input-area'>
                            <textarea rows={3} value={replyContent}
                                onChange={(e)=>setReplyContent(e.target.value)}></textarea>
                        </div>
                        <div className='replyModal-button-area'>
                            <button type='button' onClick={onClose}
                                className='reply-cancel-btn'>
                                취소
                            </button>
                            <button type='submit'
                                className='reply-submit-btn'>
                                전송
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

const EditMessageModal=({ editContent, handleEditMessage, onClose , setEditContent}) => {
    return (
        <div className='editMessageModalOverlay' onClick={onClose}>
            <div className='editMessageModalInner'
                onClick={(e)=> e.stopPropagation()}>
                <div className='editMessageModalHeader'>
                    <p>메시지를 수정하세요.</p>
                </div>
                <div className='editMessageModalMain'>
                    <textarea value={editContent}
                        rows={3}
                        onChange={(e)=>{
                            setEditContent(e.target.value)
                        }}></textarea>
                </div>
                <div className='editMessageModalFooter'>
                    <button className='edit-cancel-btn'
                        onClick={onClose} type='button'
                    >취소</button>
                    <button type='button'
                        className='edit-confirm-btn'
                        onClick={handleEditMessage}
                    >확인</button>
                </div>
            </div>
        </div>
    )
}

const ParticipantModal=({participants, userId, onClose, isGroup, handleOpenInviteModal}) => {
    return (
        <div className='participantModalOverlay' onClick={onClose}>
            <div className='participantModalContent' onClick={(e)=>e.stopPropagation()}>
                <div className='participantModalHeader'>
                    <h3>대화 상대</h3>
                    <button className='participantModalCloseBtn' 
                        onClick={onClose} type='button'>✕</button>
                </div>
                <div className='participantModalBody'>
                    {
                        participants.map((participant) => (
                            <div key={participant.participantId}
                                className='participantItem'>
                                <div className='participantInfo'>
                                    <div className='participantNameRow'>
                                        <p className='participantName'>
                                            {participant.userName}
                                        </p>
                                        {participant.userId === userId && (
                                            <span className='participantMeBadge'>나</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className='participantModalFooter'>
                    {
                        isGroup && (
                            <button onClick={handleOpenInviteModal} type='button'
                                className='chat-room-open-invite-btn'>
                                초대하기
                            </button>
                        )
                    }
                </div>
            </div>
        </div>
    );
  };

  const InviteModal=({ inviteStaffList, selectedStaffIds, onToggleStaff,
        onInvite, onClose, onBack
   }) => {
    return (
        <div className='inviteModalOverlay' onClick={onClose}>
            <div className='inviteModalContent' onClick={(e) => e.stopPropagation()}>
                <div className='inviteModalHeader'>
                    <h3>직원 초대</h3>
                    <button className='inviteModalCloseBtn' onClick={onClose}
                        type='button'
                    >✕</button>
                </div>

                <div className='inviteModalBody'>
                    {
                        inviteStaffList.length === 0 ? (
                            <p className='inviteEmptyText'>초대 가능한 직원이 없습니다.</p>
                        ) : (
                            inviteStaffList.map((staff) => (
                                <label key={staff.userId} className='inviteStaffItem'>
                                    <div className='inviteStaffLeft'>
                                        <input type='checkbox'
                                            checked={selectedStaffIds.includes(staff.userId)}
                                            onChange={() => onToggleStaff(staff.userId)}
                                        />
                                        <div className='inviteStaffInfo'>
                                            <p className='inviteStaffName'>
                                                {staff.username}
                                            </p>
                                            <p className='inviteStaffMeta'>
                                                {staff.department} {staff.role ? `/ ${staff.role}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            ))
                        )
                    }
                </div>

                <div className='inviteModalFooter'>
                    <button type='button' onClick={onBack} className='inviteBackBtn'>
                        뒤로가기
                    </button>
                    <button type='button' onClick={onInvite} className='inviteSubmitBtn'>
                        초대하기
                    </button>
                </div>
            </div>
        </div>
    )
  }

const ChatRoom = ({ roomId, clientRef, connected, onReadRoom, onLeaveRoom, roomRefresh, 
    getRooms, setAttachmentArchive, setRoomName
 }) => {
  const [room, setRoom]=useState(null)
  const [messageSlice, setMessageSlice]=useState({
    messages:[],
    hasNext:false,
    nextCursor:null
  });

  const [loading, setLoading]=useState(false);
  const [loadingOld, setLoadingOld]=useState(false);
  const [content, setContent]=useState("");
  const [hasNewMessage, setHasNewMessage]=useState(false);
  const [participants, setParticipants]=useState([]);
  const [openParticipantModal, setOpenParticipantModal]=useState(false);
  const [openInviteModal, setOpenInviteModal]=useState(false);
  const [inviteStaffList, setInviteStaffList]=useState([]);
  const [selectedStaffIds, setSelectedStaffIds]=useState([]);
  const [openPopId, setOpenPopId]=useState(null);
  const [editContent, setEditContent]=useState("");
  const [openEditModal, setOpenEditModal]=useState(false);
  const [targetMessageId, setTargetMessageId]=useState(null);
  const [openReplyModal, setOpenReplyModal]=useState(false);
  const [parentMessage, setParentMessage]=useState(null);
  const [selectedFiles, setSelectedFiles]=useState([]);

  const subscriptionRef=useRef(null);
  const readSubscriptionRef=useRef(null);
  const updateSubscriptionRef=useRef(null);
  const messageAreaRef=useRef(null);
  const firstLoadRef=useRef(true);
  const syncingReadRef=useRef(false);
  const pendingReadSyncRef=useRef(false);
  const popoverRef=useRef(null);
  const fileInputRef=useRef(null);

  const userId=Number(sessionStorage.getItem("userId"));

  const isGroup=room?.roomType === 'GROUP';

  const applyReadStatus=(readStatus)=>{
    setMessageSlice(prev => ({
        ...prev,
        messages: prev.messages.map(msg => {
            //시스템 메시지는 제외
            if(msg.messageType !== 'USER'){
                return msg;
            }

            //읽은 당사자가 보낸 메시지 제외
            if(msg.senderId === readStatus.userId){
                return msg;
            }

            //읽은 범위 안에 있는 메시지면 unreadCount - 1
            if(msg.messageId <= readStatus.lastReadMessageId){
                return {
                    ...msg,
                    unreadCount : Math.max((msg.unreadCount ?? 0) - 1, 0)
                };
            }

            return msg;
        })
    }));
  };

  useEffect(() => {
        setSelectedStaffIds([]);
        setInviteStaffList([]);
        setOpenParticipantModal(false);
        setOpenInviteModal(false);
        syncingReadRef.current=false;
        pendingReadSyncRef.current=false;
        setSelectedFiles([]);
  }, [roomId]);
  
  useEffect(()=>{
    if(!roomId){
        setRoom(null);
        setParticipants([]);
        setMessageSlice({
            messages:[],
            hasNext:false,
            nextCursor:null
        });
        setContent("");
        setHasNewMessage(false);
        firstLoadRef.current=true;
        syncingReadRef.current=false;
        pendingReadSyncRef.current=false;
        return;
    }

    const getChatRoomDetail=async()=>{
        try{
            setLoading(true);

            const data=await chatRoomDetail({
                roomId:roomId,
                cursor:null
            });

            setRoom(data.result.room);
            setParticipants(data.result.participants ?? []);
            setMessageSlice(data.result.messages);
            onReadRoom(roomId);
            setHasNewMessage(false);
            firstLoadRef.current=true;
        }catch(error){
            console.log(error);
        }finally{
            setLoading(false);
        }
    };

    setContent("");
    getChatRoomDetail();

  },[roomId]);

  useEffect(()=>{
    if(openPopId === null) return;

    const handleClickOutside=(e)=>{
        if(popoverRef.current && !popoverRef.current.contains(e.target)){
            setOpenPopId(null);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return ()=>{
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopId]);

  useEffect(()=>{
    if(!firstLoadRef.current) return;

    const container=messageAreaRef.current;
    if(!container) return;
    if(!messageSlice.messages.length) return;

    container.scrollTop=container.scrollHeight;
    firstLoadRef.current=false;
  },[messageSlice.messages]);

  useEffect(()=>{
    const client=clientRef.current;

    if(!roomId || !client || !connected) return;

    if(subscriptionRef.current){
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
    }

    if(readSubscriptionRef.current){
        readSubscriptionRef.current.unsubscribe();
        readSubscriptionRef.current = null;
    }

    if(updateSubscriptionRef.current){
        updateSubscriptionRef.current.unsubscribe();
        updateSubscriptionRef.current = null;
    }

    //새 메시지 구독
    subscriptionRef.current=client.subscribe(`/topic/chat/room/${roomId}`,async (message) => {
        const newMessage=JSON.parse(message.body);
        const nearBottom=isNearBottom();
        const isMine=Number(newMessage.senderId) === Number(userId);

        const result={
            ...newMessage,
            mine: isMine
        }

        setMessageSlice(prev => ({
            ...prev,
            messages:[...prev.messages, result]
        }));

        if(nearBottom || isMine){
            await markAsRead(roomId);
            onReadRoom(roomId);

            setTimeout(() => {
                const container = messageAreaRef.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 0);
        } else {
            setHasNewMessage(true);
        }
    });

    //읽음 이벤트 구독
    readSubscriptionRef.current = client.subscribe(
        `/topic/chat/room/${roomId}/read`,
        async (message) => {
            const readStatus=JSON.parse(message.body);

            if(!isGroup) {
                applyReadStatus(readStatus);
                return;
            }

            if(syncingReadRef.current) {
                pendingReadSyncRef.current=true;
                return;
            }

            syncingReadRef.current=true;

            try{
                while(true){
                    pendingReadSyncRef.current=false;

                    const res=await chatRoomDetail({
                        roomId,
                        cursor:null
                    });

                    setMessageSlice(prev => ({
                        ...prev,
                        messages: prev.messages.map(prevMsg => {
                            const freshMsg = (res.result.messages?.messages ?? [])
                                .find(msg => msg.messageId === prevMsg.messageId);
                            
                            return freshMsg
                                ? {...prevMsg, unreadCount: freshMsg.unreadCount}
                                : prevMsg;
                        })
                    }));

                    if(!pendingReadSyncRef.current){
                        break;
                    }
                }
            }catch(error){
                console.log(error);
            }finally{
                syncingReadRef.current=false;
            }
        }
    );

    //메시지 수정/삭제 구독
    updateSubscriptionRef.current=client.subscribe(
        `/user/queue/chat/room/${roomId}/message/update`,
        async (message) => {
            const payload=JSON.parse(message.body);

            if(payload.result.lastMessage){
                await getRooms();
            }

            updateMessageInState(payload.result);
        }
    );

    return ()=>{
        if(subscriptionRef.current){
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current=null;
        }

        if(readSubscriptionRef.current){
            readSubscriptionRef.current.unsubscribe();
            readSubscriptionRef.current = null;
        }
        if(updateSubscriptionRef.current){
            updateSubscriptionRef.current.unsubscribe();
            updateSubscriptionRef.current=null;
        }
    };
  }, [roomId, clientRef, connected, isGroup]);

  useEffect(()=>{
    if(!roomId) return;
    if(roomRefresh === 0) return;

    const reload = async () => {
        try{
            const data=await chatRoomDetail({
                roomId:roomId,
                cursor: null
            });

            setRoom(data.result.room);
            setParticipants(data.result.participants ?? []);
        }catch (error) {
            console.log(error);
        }
    };

    reload();
  },[roomRefresh, roomId]);

  const sendMessage=async()=>{
    const text=content.trim();
    const client=clientRef.current;

    if (!text && selectedFiles.length === 0){
        alert("메세지 내용을 입력하거나 파일을 첨부하세요.");
        return;
    } 

    if(!client || !connected){
        alert("웹소켓 연결이 아직 완료되지 않았습니다.");
        return;
    }

    try{
        let uploadFiles=[];

        if(selectedFiles.length > 0){
            const res=await uploadAttachment(selectedFiles);
            uploadFiles=res.result ?? [];
        }

        client.publish({
            destination: `/app/chat/send/user`,
            body:JSON.stringify({
                roomId:roomId,
                content:text,
                parentMessageId:targetMessageId ? targetMessageId : null,
                attachments:uploadFiles
            })
        });

        setContent("")
        setParentMessage(null);
        setOpenReplyModal(false);
        setTargetMessageId(null);
        setSelectedFiles([]);
    }catch(error){
        console.log(error);
        alert("메시지 전송이 실패했습니다. 오류 로그를 확인하세요.");
    }

  };

  const loadOlderMessages=async()=>{
    if(!roomId || loadingOld || !messageSlice.hasNext) return;

    const container=messageAreaRef.current;
    if(!container) return;

    const prevScrollHeight=container.scrollHeight;
    const prevScrollTop=container.scrollTop;

    try{
        setLoadingOld(true);

        const data=await chatRoomDetail({
            roomId:roomId,
            cursor:messageSlice.nextCursor
        });
        
        const olderSlice=data.result.messages;

        setMessageSlice(prev => ({
            ...prev,
            messages: [...olderSlice.messages, ...prev.messages],
            hasNext: olderSlice.hasNext,
            nextCursor: olderSlice.nextCursor
        }));

        setTimeout(()=>{
            const newScrollHeight=container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        }, 0);

    }catch(error){
        console.log(error);
    }finally{
        setLoadingOld(false);
    }
  }

  const isNearBottom=()=>{
    const container=messageAreaRef.current;
    if(!container) return false;

    return container.scrollHeight - container.scrollTop - container.clientHeight <= 80;
  }

  const handleOpenInviteModal=async() => {
    try{
        const data=await getStaffListForInvite(roomId);

        setInviteStaffList(data.result);
        setOpenParticipantModal(false);
        setOpenInviteModal(true);
    } catch(error) {
        console.log(error);
        alert("초대 가능한 직원 목록 조회 실패!");
    } 
  }

  const handleToggleInvite=(targetUserId) => {
    setSelectedStaffIds(prev => 
        prev.includes(targetUserId)
        ? prev.filter(id => id !== targetUserId)
        : [...prev, targetUserId]
    );
  };

  const handleInviteStaff=async() => {
    if(selectedStaffIds.length === 0){
        alert("초대할 직원을 선택하세요.");
        return;
    }

    try{
        await inviteStaff(roomId, selectedStaffIds);
        alert("직원 초대가 완료되었습니다.");

        setSelectedStaffIds([]);
        setOpenInviteModal(false);
    }catch(error){
        console.log(error);
        alert("직원 초대 실패!");
        return;
    }

    try{
        const data=await chatRoomDetail({
            roomId:roomId,
            cursor:null
        });

        setRoom(data.result.room);
        setParticipants(data.result.participants ?? []);
    }catch(error){
        console.log(error);
        alert("채팅방 정보를 다시 불러오지 못했습니다.");
    }
  };

  const handleLeaveRoom=async()=>{
    const ok=window.confirm("채팅방에서 퇴장하시겠습니까?");
    if(!ok) return;

    try{
        await leaveChatRoom(roomId);
        alert("채팅방에서 퇴장했습니다.");

        if(onLeaveRoom){
            onLeaveRoom();
        }
    }catch(error){
        console.log(error);
        alert("채팅방 퇴장 실패!");
    }
  }

  if(!roomId){
    return <div className='chat-room-empty'>
        <div className='chat-room-empty-box'>
            채팅방을 선택하세요
        </div>
    </div>
  }

  if(!room){
    return <div className='chat-room-empty'>
        <div className='chat-room-empty-box'>
            채팅방 정보를 불러오는 중...
        </div>
    </div>
  }

  const handleScroll=async()=>{
    const container=messageAreaRef.current;
    if(!container) return;

    if(container.scrollTop <= 50){
        await loadOlderMessages();
    }

    const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <= 80;

    if(nearBottom && hasNewMessage){
        setHasNewMessage(false);
        await markAsRead(roomId);
        onReadRoom(roomId);
    }
  };

  const orderedMessages=messageSlice.messages;
  const lastMyUserMessageId=[...orderedMessages].reverse()
            .find(m => m.senderId === userId && m.messageType === 'USER')?.messageId ?? null;
  const shouldShowUnreadCount=(message, isMine) => {
    if(!isMine) return false;
    if(message.messageType !== 'USER') return false;
    if(!message.unreadCount || message.unreadCount <= 0) return false;

    if(room?.roomType === "DIRECT"){
        return message.messageId === lastMyUserMessageId;
    }

    return true;
  }

  const updateMessageInState= (updateMessage) => {
    setMessageSlice(prev => ({
        ...prev,
        messages:prev.messages.map(msg => {
            const parent=msg.parentMessage;

            if(msg.messageId === updateMessage.messageId){
                return {...msg, ...updateMessage};
            }

            if(parent && parent.parentMessageId === updateMessage.messageId){
                return {
                    ...msg,
                    parentMessage: {
                        ...parent,
                        parentMessageContent: updateMessage.deleted
                            ? null
                            : updateMessage.content,
                        parentMessageIsDeleted: !!updateMessage.deleted
                    }
                };
            }

            return msg;
        })
    }));
  };

  const handleEditMessage=async(messageId) => {
    try{
        const res=await editMessage(messageId, editContent);
        const editedMessage=res.result;

        updateMessageInState(editedMessage);
        await getRooms();

        setEditContent("");
        setTargetMessageId(null);
        setOpenEditModal(false);
        setOpenPopId(null);
    }catch(error){
        console.log(error);
    }
  };

  const handleDeleteMessage=async(messageId) => {
    const ok=window.confirm("메시지를 삭제하시겠습니까?");
    if(!ok) return;

    const param=Number(messageId);

    try{
        const res=await deleteMessage(param);
        const deletedMessage=res.result;

        updateMessageInState(deletedMessage);
        await getRooms();

        setOpenPopId(null);
    }catch(error){
        console.log(error);
    }
  }

  const replyModalClose=()=>{
    setContent("");
    setOpenReplyModal(false);
    setTargetMessageId(null);
    setOpenPopId(null);
    setParentMessage(null);
    setSelectedFiles([]);
  }

  const editMessageModalClose=()=>{
    setEditContent("");
    setOpenEditModal(false);
    setTargetMessageId(null);
  }

  const shouldShowTime=(current, next) => {
    if(!next) return true;

    //보낸 사람이 다르면 표시
    if(current.senderId !== next.senderId) return true;

    //시간 차이 계산
    const diff=(new Date(next.createdAt) - new Date(current.createdAt)) / 1000 / 60;

    if(diff >= 1) return true;

    return false;
  }

  const shouldShowDate=(current, previous)=>{
    const day1=new Date(current);
    const day2=new Date(previous);

    return (
        day1.getFullYear() !== day2.getFullYear() ||
        day1.getMonth() !== day2.getMonth() ||
        day1.getDate() !== day2.getDate()
    );
  };

  const handleClickAttach=()=>{
    fileInputRef.current?.click();
  };

  const handleChangeFile=(e)=>{
    const files=Array.from(e.target.files || []);
    if(files.length === 0) return;
    setSelectedFiles((prev)=>[...prev, ...files]);
    e.target.value="";
  }

  const removeSelectedFile=(removeIndex)=>{
    setSelectedFiles((prev) => prev.filter((_, index) => index !== removeIndex));
  };

  return (
    <div className='chat-room-panel'>
        {
            userId && 
            <>
                <div className='chat-room-header'>
                    <div className='chat-room-header-leave'>
                        {
                            isGroup && (
                                <button onClick={handleLeaveRoom} type='button'
                                    className='chat-room-leave-btn'>
                                    나가기
                                </button>
                            )
                        }
                    </div>
                    <div className='chat-room-header-title-wrap'>
                        <p className='chat-room-header-title'>
                            {room.customRoomName ? room.customRoomName:room.roomName}
                        </p>
                    </div>
                    <div className='chat-room-header-modal'>
                        <button className='chat-room-participant-btn' type='button'
                            onClick={()=>setOpenParticipantModal(true)}>
                            {participants.length}명
                        </button>
                    </div>
                    <div className='chat-room-attachment-button-wrap'>
                        <button type='button' className='show-attachment-archive-btn'
                            onClick={()=>{
                                setRoomName(room.customRoomName ? room.customRoomName:room.roomName)
                                setAttachmentArchive(true)
                            }}>
                            보관함
                        </button>
                    </div>
                </div>
                <div className='chat-message-area' ref={messageAreaRef}
                    onScroll={handleScroll}>
                    {
                        orderedMessages != null &&
                        orderedMessages.map((m, idx) => {
                            const parent=m.parentMessage;
                            const next=orderedMessages[idx + 1];
                            const previous=orderedMessages[idx - 1];

                            const showDate= !previous 
                                || shouldShowDate(m.createdAt, previous.createdAt);

                            if (m.messageType === 'SYSTEM') {
                                return (
                                    <div key={m.messageId} className='chat-system-message-row'>
                                        <div className='chat-system-message'>
                                            {m.content}
                                        </div>
                                    </div>
                                );
                            }

                            const isMine=Number(m.senderId) === Number(userId);
                            const canDelete=isMine && 
                                !m.deleted && m.messageType !== 'SYSTEM';
                            const canReply=!m.deleted && m.messageType === 'USER';
                            const canEdit=isMine && !m.deleted && m.messageType !== 'SYSTEM'
                                            && m.content !== null;
                            const canOpenPop=canDelete || canEdit || canReply;

                            let messageText;
                            if(m.deleted){
                                messageText='삭제된 메시지입니다.';
                            } else if(m.edited && !m.deleted){
                                messageText=m.content + ' (수정됨)';
                            } else {
                                messageText=m.content;
                            }

                            return (
                                <div key={m.messageId}
                                        className={isMine 
                                                    ? 'chat-message-row mine' 
                                                    : 'chat-message-row'}
                                    >
                                    {
                                        showDate && (
                                            <div className='chat-date-divider'>
                                                {dayjs(m.createdAt).format('YYYY년 M월 D일')}
                                            </div>
                                        )
                                    }    
                                    {!isMine && <p className="chat-sender-name">{m.senderName}</p>}

                                    <div className='chat-message-wrap'>
                                        <div className='chat-message-content'>
                                            {
                                                isMine ? (
                                                    <>
                                                        <div className='chat-message-side'>
                                                            {shouldShowUnreadCount(m, isMine) && (
                                                                <div
                                                                    className='chat-unread-box'
                                                                >
                                                                    <span className='chat-unread-count'>
                                                                        {m.unreadCount}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {
                                                                shouldShowTime(m, next) && (
                                                                    <div
                                                                        className='chat-time-box'
                                                                    >
                                                                        <span className='chat-time'>
                                                                            {dayjs(m.createdAt).format('HH시 mm분')}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            }
                                                        </div>

                                                        <div className='chat-bubble-box'>
                                                            <div className={`${isMine ? 'chat-bubble mine' : 'chat-bubble'} 
                                                                    ${m.deleted ? 'deleted' : ''}`}>
                                                                {parent && (
                                                                    <div className='reply-preview'>
                                                                        <div className='reply-preview-sender-wrap'>
                                                                            <p className='reply-preview-sender'>
                                                                                {
                                                                                    parent.parentMessageUserName
                                                                                    ?? '알 수 없음'
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                        <div className='reply-preview-file'>
                                                                            {
                                                                                !parent.parentMessageIsDeleted &&
                                                                                parent.parentMessageAttachments &&
                                                                                parent.parentMessageAttachments.length > 0 && (
                                                                                    <div className='reply-preview-attachments'>
                                                                                        {
                                                                                            parent.parentMessageAttachments.map((file)=>(
                                                                                                <AttachmentItem key={file.attachmentId}
                                                                                                    file={file}/>
                                                                                            ))
                                                                                        }
                                                                                    </div>
                                                                                ) 
                                                                            }
                                                                            <div className='reply-preview-content'>
                                                                                <p className='reply-preview-text'>
                                                                                    {parent.parentMessageIsDeleted ? '삭제된 메시지입니다.'
                                                                                        : parent.parentMessageContent}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className='chat-message-box'>
                                                                    {
                                                                        m.attachments && m.attachments.length > 0 && (
                                                                            <div className='chat-message-attachments'>
                                                                                {
                                                                                    m.attachments.map((file)=>(
                                                                                        <AttachmentItem key={file.attachmentId}
                                                                                                    file={file}/>
                                                                                    ))
                                                                                }
                                                                            </div>
                                                                        )
                                                                    }
                                                                    <div className='chat-message-text-wrap'>
                                                                        <p className='chat-message-text'>
                                                                            {messageText}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {
                                                                canOpenPop && (
                                                                    <button
                                                                        className='bubble-menu-btn'
                                                                        onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenPopId(prev => 
                                                                            prev === m.messageId 
                                                                            ? null 
                                                                            : m.messageId);}}
                                                                        type='button'>
                                                                            ⋮
                                                                    </button>
                                                                )
                                                            }
                                                        </div>
                                                    </>
                                                )
                                                :
                                                (
                                                <>
                                                    <div className='chat-bubble-box'>
                                                    <div 
                                                        className={`${isMine ? 'chat-bubble mine' : 'chat-bubble'} 
                                                            ${m.deleted ? 'deleted' : ''}`}>
                                                        {parent && (
                                                            <div className='reply-preview'>
                                                                <div className='reply-preview-sender-wrap'>
                                                                    <p className='reply-preview-sender'>
                                                                        {
                                                                            parent.parentMessageUserName
                                                                            ?? '알 수 없음'
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className='reply-preview-file'>
                                                                   {
                                                                        parent.parentMessageAttachments &&
                                                                        parent.parentMessageAttachments.length > 0 && (
                                                                        <div className='reply-preview-attachments'>
                                                                            {
                                                                               parent.parentMessageAttachments.map((file)=>(
                                                                                    <AttachmentItem key={file.attachmentId}
                                                                                        file={file}/>
                                                                                ))
                                                                            }
                                                                        </div>
                                                                        ) 
                                                                    }
                                                                    <div className='reply-preview-content'>
                                                                        <p className='reply-preview-text'>
                                                                            {parent.parentMessageIsDeleted ? '삭제된 메시지입니다.'
                                                                                : parent.parentMessageContent}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                         <div className='chat-message-box'>
                                                            {
                                                                m.attachments && m.attachments.length > 0 && (
                                                                <div className='chat-message-attachments'>
                                                                    {
                                                                        m.attachments.map((file)=>(
                                                                            <AttachmentItem key={file.attachmentId}
                                                                                file={file}/>
                                                                        ))
                                                                    }
                                                                </div>
                                                                )
                                                            }
                                                            <div className='chat-message-text-wrap'>
                                                                <p className='chat-message-text'>
                                                                    {messageText}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {
                                                        canReply && (
                                                            <button
                                                                className='bubble-menu-btn'
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenPopId(prev => 
                                                                        prev === m.messageId 
                                                                        ? null 
                                                                        : m.messageId);}}
                                                                type='button'>
                                                                    ⋮
                                                            </button>
                                                        )
                                                    }
                                                </div>

                                                    <div className='chat-message-side'>
                                                    {
                                                        shouldShowTime(m, next) && (
                                                            <div className='chat-time-box'>
                                                            <span className='chat-time'>
                                                                {dayjs(m.createdAt).format('HH시 mm분')}
                                                            </span>
                                                        </div>
                                                    )
                                                    }
                                                </div>
                                                </>
                                                )
                                            }
                                        </div>
                                        {
                                            Number(openPopId) === Number(m.messageId) && (
                                                <div className='chat-bubble-pop'
                                                    ref={popoverRef}
                                                    onClick={(e)=> e.stopPropagation()}
                                                >
                                                    {
                                                        canReply && (
                                                            <button type='button'
                                                                className='reply-btn'
                                                                onClick={()=>{
                                                                    setTargetMessageId(m.messageId);
                                                                    setParentMessage(m);
                                                                    setOpenReplyModal(true);
                                                                    setOpenPopId(null);
                                                                    setSelectedFiles([]);
                                                                }}>
                                                                답장
                                                            </button>
                                                        )
                                                    }
                                                    {
                                                        canDelete && (
                                                            <>
                                                                <button
                                                                    type='button'
                                                                    className='delete-btn'
                                                                    onClick={()=>{
                                                                        handleDeleteMessage(m.messageId);
                                                                    }}
                                                                >
                                                                        삭제
                                                                </button>
                                                            </>
                                                        )
                                                    }
                                                    {
                                                        canEdit && (
                                                            <>
                                                                <button
                                                                    type='button'
                                                                    className='edit-btn'
                                                                    onClick={()=>{
                                                                        setEditContent(m.content);
                                                                        setTargetMessageId(m.messageId);
                                                                        setOpenEditModal(true);
                                                                        setOpenPopId(null);
                                                                    }}
                                                                >
                                                                        수정
                                                                </button>
                                                            </>
                                                        )
                                                    }
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
                {
                        hasNewMessage && (
                            <button
                                type='button'
                                className='new-message-alert'
                                onClick={async()=>{
                                    const container=messageAreaRef.current;
                                    if(container){
                                        container.scrollTop=container.scrollHeight;
                                    }

                                    setHasNewMessage(false);
                                    await markAsRead(roomId);
                                    onReadRoom(roomId);
                                }}    
                            >
                                새 메시지 ↓
                            </button>
                        )
                }
                <div className='chat-input-wrap'>
                    {
                        selectedFiles.length > 0 && (
                            <div className='chat-attachment-preview'>
                                {
                                    selectedFiles.map((file, index) => (
                                        <div key={`${file.name}-${index}`}
                                            className='chat-attach-item'>
                                            <div className='chat-attach-info'>
                                                <span
                                                    className='chat-attach-name'>
                                                        {file.name}
                                                </span>
                                                <span className='chat-attach-size'>
                                                    {(file.size / 1024 /1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                            <button
                                                type='button'
                                                className='chat-attach-remove-btn'
                                                onClick={()=>removeSelectedFile(index)}>
                                                ×
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                        )
                    }
                    <div className='chat-input-area'>
                        <div className='chat-input-content-area'>
                            <form className='chat-input-form'
                                onSubmit={(e)=>{
                                e.preventDefault();
                                sendMessage();
                            }}>
                                <button type='button' className='chat-attach-btn'
                                    onClick={handleClickAttach}>📎</button>
                                <input type='file' ref={fileInputRef}
                                    accept='image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
                                    style={{display:'none'}} multiple
                                    onChange={handleChangeFile}/>
                                <textarea value={content} placeholder='메시지를 입력하세요.'
                                    onChange={(e)=>{
                                        setContent(e.target.value)
                                    }}
                                    className='chat-input'
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                if (!content.trim()) return;
                                            sendMessage();
                                            }
                                        }
                                    }
                                />
                                <button type='submit'
                                    className='chat-send-btn'>전송</button>
                            </form>
                        </div>
                    </div>
                </div>
            </>
        }
        {
            openParticipantModal && (
                <ParticipantModal participants={participants} userId={userId}
                    onClose={()=>setOpenParticipantModal(false)}
                    isGroup={isGroup} handleOpenInviteModal={handleOpenInviteModal}/>
            )
        }
        {
            openInviteModal && (
                <InviteModal
                    inviteStaffList={inviteStaffList}
                    selectedStaffIds={selectedStaffIds}
                    onToggleStaff={handleToggleInvite}
                    onInvite={handleInviteStaff}
                    onClose={() => {
                        setSelectedStaffIds([]);
                        setOpenInviteModal(false);
                    }}
                    onBack={() => {
                        setSelectedStaffIds([]);
                        setOpenInviteModal(false);
                        setOpenParticipantModal(true);
                    }}
                />
            )
        }
        {
            openEditModal && (
                <EditMessageModal
                    editContent={editContent}
                    handleEditMessage={()=>handleEditMessage(targetMessageId)}
                    onClose={editMessageModalClose}
                    setEditContent={setEditContent}
                />
            )
        }
        {
            openReplyModal && (
                <ReplyModal
                    handleReply={sendMessage}
                    setReplyContent={setContent}
                    parentMessage={parentMessage}
                    onClose={replyModalClose}
                    replyContent={content}
                />
            )
        }
    </div>
  )
}

export default ChatRoom