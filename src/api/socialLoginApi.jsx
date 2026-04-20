import socialAxios from "./socialAxios"
export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

export const getNaverUserInfo=async()=>{
    const res=await socialAxios.get(`${API_BASE_URL}/social/login/naver/info`);
    return res.data;
}

export const naverLogin=async(param)=>{
    const res=await socialAxios.post(`${API_BASE_URL}/social/login/naver/complete`, param);
    return res.data;
}

export const socialUserLogin=async()=>{
    const res=await socialAxios.get(`${API_BASE_URL}/social/login/complete`);
    return res.data;
}

export const getKakaoUserInfo=async()=>{
    const res=await socialAxios.get(`${API_BASE_URL}/social/login/kakao/info`);
    return res.data;
}

export const kakaoLogin=async(param)=>{
    const res=await socialAxios.post(`${API_BASE_URL}/social/login/kakao/complete`, param);
    return res.data;
}