import axios from "axios";
export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

export const emailCheck=async(email)=>{
    const res=await axios.get(`${API_BASE_URL}/join/check/email`, {
        params: email ? { email } : {}
    });
    return res.data;
}

export const rrnCheck=async(rrn)=>{
    const res=await axios.get(`${API_BASE_URL}/join/check/rrn`, {
        params: rrn ? {rrn} : {}
    });
    return res.data;
}

export const join=async(param)=>{
    const res=await axios.post(`${API_BASE_URL}/join`, param);
    return res.data;
}