import axios from "axios";
export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

export const loginPost=async(param)=>{
    const params=new URLSearchParams();
    params.append("email",param.email);
    params.append("password",param.password);
    const res=await axios.post(`${API_BASE_URL}/login`,params, {
        withCredentials: true
    });
    console.log("res", res);
    return res.data;
}

