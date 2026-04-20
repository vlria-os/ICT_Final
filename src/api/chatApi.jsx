import jwtAxios from "./jwtAxios";
export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

export const host=`${API_BASE_URL}/chat`;
export const chatRoomList=async()=>{
    const res=await jwtAxios.get(`${host}/room/list`);
    return res.data;
}

export const chatRoomDetail=async({roomId, cursor})=>{
    const res=await jwtAxios.get(`${host}/room/${roomId}`, {
        params: cursor ? {cursor} : {}
    });
    return res.data;
}

export const openAttachmentArchive=async({roomId, cursor})=>{
    const res=await jwtAxios.get(`${host}/room/${roomId}/attachment`,{
        params: cursor ? {cursor} : {}
    });
    return res.data;
}

export const uploadAttachment=async(files) => {
    const formData=new FormData();

    Array.from(files).forEach((file)=>{
        formData.append("files", file);
    });

    const res=await jwtAxios.post(`${host}/upload/attachment`, formData);
    return res.data;
}

export const sendMessage=async(param)=>{
    const res=await jwtAxios.post(`${host}/send/user`,{
        roomId:param.roomId,
        content:param.content,
        parentMessageId: param.parentMessageId,
        attachments: param.attachments
    });

    return res.data;
}

export const markAsRead=async(roomId)=>{
    const res=await jwtAxios.post(`${host}/read/${roomId}`);
    return res.data;
}

export const createChatRoom=async (param) =>{
    const res=await jwtAxios.post(`${host}/room`, param);
    return res.data;
}

export const getStaffList=async (keyword) => {
    const res=await jwtAxios.get(`${host}/staff/list`, {
        params: keyword ? { keyword } : {}
    });
    return res.data;
}

export const getStaffListForInvite=async (roomId) => {
    const res=await jwtAxios.get(`${host}/room/${roomId}/invite/staff`);
    return res.data;
}

export const inviteStaff=async (roomId, staffIds) => {
    const res=await jwtAxios.post(`${host}/room/${roomId}/invite`, staffIds);
    return res.data;
}

export const leaveChatRoom=async (roomId) => {
    const res=await jwtAxios.delete(`${host}/room/${roomId}/leave`);
    return res.data;
}

export const deleteMessage=async(messageId) => {
    const res=await jwtAxios.delete(`${host}/delete/message/${messageId}`);
    return res.data;
}

export const editMessage=async(messageId, content) => {
    const res=await jwtAxios.put(`${host}/edit/message/${messageId}`, {
        content:content
    });
    return res.data;
}