import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { createChatRoom, getStaffList } from '../../../api/chatApi';
import { useNavigate } from 'react-router-dom';

const ChatRoomList = ({ rooms, selectedRoomId, onSelectRoom, staffList, setStaffList, setRooms }) => {
  const userId=useSelector(state=>state.auth.userId);
  const [openCreateModal, setOpenCreateModal]=useState(false);
  const [keyword, setKeyword]=useState("");
  const [selectedUsers, setSelectedUsers]=useState([]);
  const [roomName, setRoomName]=useState("");

  useEffect(()=>{
    const timer=setTimeout(async () => {
        try{
            const text=keyword.trim();
            const data=text ? await getStaffList(text) : await getStaffList();

            setStaffList(data.result);
        }catch(error){
            console.log(error);
        }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, setStaffList]);

  const formatDate=(dateTime)=>{
    if(!dateTime) return '';

    const now=new Date();
    const d=new Date(dateTime);

    //올해 이전
    if(d.getFullYear() < now.getFullYear()){
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }

    //오늘
    const isToday=
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

    if(isToday){
        return `${d.getHours()}시 ${String(d.getMinutes()).padStart(2, '0')}분`;
    }

    //올해지만 오늘 이전
    return `${d.getMonth()+1}월 ${d.getDate()}일`;
  }

  const handleCloseModal=()=>{
    setOpenCreateModal(false);
    setKeyword("");
    setSelectedUsers([]);
    setRoomName("");
  }

  const handleCreateChatRoom=async() => {
    try{
        const participantUserIds=selectedUsers.map(user => user.userId);
        const data={
            roomType: selectedUsers.length >= 2 ? "GROUP" : "DIRECT",
            roomName: roomName ? roomName : null,
            customRoomName: roomName ? roomName : null,
            participantUserIds: participantUserIds
        };
        const res=await createChatRoom(data);
        const room=res.result;

        setRooms(prev => {
            const exists=prev.some(r => Number(r.roomId) === Number(room.roomId));

            if(exists){
                return prev;
            }

            return [room, ...prev];
        });

        onSelectRoom(room.roomId);
        handleCloseModal();
    }catch(error){
        console.log(error);
        alert("채팅방 생성에 실패했습니다.");
    }
  }

  return (
    <div className='chat-list-panel'>
        <div className='chat-list-header'>
            <div className='chat-list-title-wrap'>
                <h1 className='chat-list-title'>채팅</h1>
            </div>
            <div className='new-chat-btn-wrap'>
                <button type='button' className='new-chat-btn'
                    onClick={()=>setOpenCreateModal(true)}>
                    New +
                </button>
            </div>
        </div>
        {
            !userId ? null :
            rooms.length === 0 ?
            (<div className='chat-list-empty'>참여 중인 채팅방이 없습니다.</div>)
            :(
                <div className='chat-room-list'>
                {
                    rooms.map(r => {
                        const roomName=r.customRoomName ? r.customRoomName:r.roomName;

                        const showText=!r.lastMessageIsDeleted && r.lastMessageText !== null;
                        const showFile=!r.lastMessageIsDeleted && r.lastMessageHasAttachment && r.lastMessageText === null;
                        const hasNoMessage=r.lastMessageId === null;

                        return <div key={r.roomId}
                                    onClick={()=>onSelectRoom(r.roomId)}
                                    className={Number(selectedRoomId) === Number(r.roomId)
                                            ? 'chat-room-item active-chat-room' 
                                            : 'chat-room-item'}>
                            <div className='chat-room-top'>
                                <div className='chat-room-title-wrap'>
                                    <p className='chat-room-title'>
                                        {roomName}
                                    </p>
                                    {
                                        r.participantCount > 2 &&
                                        <span className='chat-room-count'>
                                            {r.participantCount}명
                                        </span>
                                    }
                                </div>
                                <div className='chat-room-time'>
                                    {
                                        r.lastMessageAt ?
                                        <p>{formatDate(r.lastMessageAt)}</p>
                                        :null
                                    }
                                </div>        
                            </div>
                            <div className='chat-room-bottom'>
                                <div className='chat-room-preview-wrap'>
                                    {
                                        showText && (
                                            <p className='chat-room-preview'>
                                                {r.lastMessageText}
                                            </p>
                                        )
                                    }
                                    {
                                        showFile && (
                                            <p className='chat-room-preview'>
                                                첨부파일
                                            </p>
                                        )
                                    }
                                    {
                                        r.lastMessageIsDeleted && (
                                            <p className='chat-room-preview'>
                                                삭제된 메시지입니다.
                                            </p>
                                        )
                                    }
                                    {
                                        hasNoMessage && (
                                            <p className='chat-room-preview empty'>
                                                아직 전송된 메시지가 없습니다
                                            </p>
                                        )
                                    }
                                </div>
                                <div className='chat-room-unread-wrap'>
                                    {
                                        r.unreadCount > 0 &&
                                        <span className='chat-room-unread'>
                                            {r.unreadCount}
                                        </span>
                                    }
                                </div>
                            </div>    
                        </div>
                    })
                }
            </div>
            )
        }
        {
            openCreateModal && (
                <div className='chat-modal-overlay' onClick={handleCloseModal}>
                    <div className='chat-create-modal' onClick={(e)=>e.stopPropagation()}>
                        <div className='chat-create-modal-header'>
                            <h2 className='chat-create-modal-title'>새 채팅</h2>
                            <button
                                type='button' className='chat-modal-close-btn'
                                onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>
                        <div className='chat-create-modal-body'>
                            <div className='chat-search-section'>
                                <label className='chat-section-label'>직원 검색</label>
                                <input type='text' className='chat-user-search-input'
                                    placeholder='이름, 부서, 직업으로 검색하세요' value={keyword}
                                    onChange={(e)=>setKeyword(e.target.value)}/>
                            </div>
                            <div className='chat-selected-section'>
                                <label className='chat-section-label'>선택된 직원</label>
                                <div className='chat-selected-user-list'>
                                    {
                                        selectedUsers.length === 0 ?
                                        (<p className='chat-selected-empty'>
                                            선택된 직원이 없습니다.
                                        </p>)
                                        :(
                                            selectedUsers.map(user => (
                                                <div key={user.userId}
                                                    className='chat-selected-user-chip'>
                                                    <span>{user.username}</span>
                                                    <button
                                                        type='button'
                                                        onClick={()=>{
                                                            setSelectedUsers(prev => 
                                                                prev.filter(u => 
                                                                    u.userId !== user.userId
                                                                )
                                                            )
                                                        }}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))
                                        )
                                    }
                                </div>
                            </div>
                            {
                                selectedUsers.length >= 2 && (
                                    <div className='chat-room-name-section'>
                                        <label className='chat-section-label'>
                                            채팅방 이름
                                        </label>
                                        <input
                                            type='text'
                                            className='chat-room-name-input'
                                            placeholder='그룹 채팅방 이름을 입력하세요'
                                            value={roomName}
                                            onChange={(e)=>setRoomName(e.target.value)}
                                        />
                                    </div>
                                )
                            }
                            <div className='chat-user-list-section'>
                                <label className='chat-section-label'>직원 목록</label>
                                <div className='chat-user-list'>
                                    {
                                        staffList.map(user => {
                                            const selected=selectedUsers
                                                    .some(u => u.userId === user.userId);

                                            return (
                                                <div key={user.userId}
                                                    className={selected 
                                                        ? 'chat-user-item selected'
                                                        : 'chat-user-item'}
                                                    onClick={()=>{
                                                        if(selected){
                                                            setSelectedUsers(prev => 
                                                                prev.filter(u => u.userId !== user.userId)
                                                            );
                                                        } else {
                                                            setSelectedUsers(prev => [...prev, user])
                                                        }
                                                    }}
                                                >
                                                    <div className='chat-user-info'>
                                                        <p className='chat-user-name'>{user.username}</p>
                                                        <p className='chat-user-meta'>
                                                            {user.department} / {user.role}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        </div>
                        <div className='chat-create-modal-footer'>
                            <button
                                type='button' className='chat-modal-cancel-btn'
                                onClick={handleCloseModal}
                            >
                                취소
                            </button>
                            <button
                                type='button'
                                className='chat-modal-submit-btn'
                                disabled={
                                    selectedUsers.length === 0 ||
                                    (selectedUsers.length >=2 && !roomName.trim())
                                }
                                onClick={handleCreateChatRoom}
                            >
                                {selectedUsers.length >= 2 ? "그룹 채팅 생성":"채팅 시작"}
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
    </div>
  )
}

export default ChatRoomList