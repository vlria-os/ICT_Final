import React, { useCallback, useEffect, useRef, useState } from 'react'
import ChatRoomList from '../component/ChatRoomList'
import ChatRoom from '../component/ChatRoom'
import "./chatLayout.css"
import { Client } from '@stomp/stompjs'
import { chatRoomList, getStaffList } from '../../../api/chatApi'
import AttachmentArchive from '../component/AttachmentArchive'
import { useNavigate } from 'react-router-dom'

const ChatLayout = () => {
  const [selectedRoomId, setSelectedRoomId]=useState(null);
  const [connected, setConnected]=useState(false);
  const [rooms, setRooms]=useState([]);
  const [staffList, setStaffList]=useState([]);
  const [webSocketReady, setWebSocketReady]=useState(false);
  const [roomRefresh, setRoomRefresh]=useState(0);
  const [showAttachmentArchive, setShowAttachmentArchive]=useState(false);
  const [roomName, setRoomName]=useState("");

  const clientRef=useRef(null);
  const navigate=useNavigate();

  const accessToken=sessionStorage.getItem('accessToken');
  const roles = sessionStorage.getItem("roles") || [];

  useEffect(()=>{
      if(!accessToken){
        navigate("/login", {replace:true});
      }

      if(roles.includes("PATIENT")){
        navigate("/", {replace:true});
      }
  },[])

  const getRooms=useCallback(
    async()=>{
        try{
            const res=await chatRoomList();

            const roomRes=res.result.map(room => 
                Number(room.roomId) === Number(selectedRoomId)
                ? {...room, unreadCount:0}
                : room
            );

            setRooms(roomRes);

            const staffRes=await getStaffList();
            setStaffList(staffRes.result);

            if(selectedRoomId && !roomRes.some(room => room.roomId === selectedRoomId)){
                setSelectedRoomId(null);
            }

            setWebSocketReady(true);
        }catch(error){
            console.log(error);
        }
  },[selectedRoomId]);  

  useEffect(()=>{
    getRooms();
  },[getRooms]);

  useEffect(()=>{
      if(!webSocketReady) return;  

      const accessToken=sessionStorage.getItem("accessToken");
      if(!accessToken) return;
  
      const client=new Client({
          brokerURL: 'ws://localhost:8080/ws',
          connectHeaders:{
              Authorization:`Bearer ${accessToken}`
          },
          reconnectDelay: 5000,
          debug: (str) => {
              console.log(str)
          }
      });
  
      client.onConnect = () => {
        console.log("WEBSOCKET_CONNECTED");
        setConnected(true);
      };
  
      client.onStompError = (error) => {
          console.error("STOMP_ERROR ==> ", error);
      };
  
      client.onWebSocketError = (error) => {
          console.error("WEBSOCKET_ERROR ==> ", error);
      };
  
      client.onWebSocketClose = (event) => {
          console.error("WEBSOCKET_CLOSE ==> ", event);
          setConnected(false)
      };
  
      client.activate();
      clientRef.current=client;
  
      return ()=>{
          if(clientRef.current){
              clientRef.current.deactivate();
              clientRef.current=null;
          }

          setConnected(false);
      };
    }, [webSocketReady]);

    useEffect(()=>{
        const client=clientRef.current;
        if(!client || !connected) return;

        const roomListSubscription=client.subscribe(
            '/user/queue/chat/list',
            async (message) => {
                const payload=JSON.parse(message.body);

                if (payload.type === 'ROOM_LIST_REFRESH') {
                    await getRooms();

                    if (Number(payload.roomId) === Number(selectedRoomId)) {
                        setRoomRefresh(prev => prev + 1);
                    }
                }
            }
        );

        return ()=>{
            roomListSubscription.unsubscribe();
        };
    },[connected, getRooms, selectedRoomId])

    const handleReadRoom=(roomId)=>{
        setRooms(prevRooms => 
            prevRooms.map(room => 
                Number(room.roomId) === Number(roomId)
                ? {...room, unreadCount: 0}
                : room
            )
        );
    };

    const handleLeaveRoomSuccess=async() => {
        setSelectedRoomId(null);
        await getRooms();
    }

  return (
    <div className='chatArea'>
        <div className='chatRoomListArea'>
            <ChatRoomList rooms={rooms} selectedRoomId={selectedRoomId} 
                onSelectRoom={setSelectedRoomId} staffList={staffList}
                setStaffList={setStaffList} setRooms={setRooms}/>
        </div>
        <div className='chatRoomArea'>
            <ChatRoom roomId={selectedRoomId} onReadRoom={handleReadRoom}
              clientRef={clientRef} connected={connected}
              onLeaveRoom={handleLeaveRoomSuccess}
              roomRefresh={roomRefresh} getRooms={getRooms}
              setAttachmentArchive={setShowAttachmentArchive}
              setRoomName={setRoomName}/>
        </div>
        {
            showAttachmentArchive && (
                <div className='AttachmentArchiveArea'>
                    <AttachmentArchive roomId={selectedRoomId}
                        roomName={roomName} setAttachmentArchive={setShowAttachmentArchive}/>
                </div>
            )
        }
    </div>
  )
}

export default ChatLayout