import axios from "axios";
export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

const socialAxios=axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

export default socialAxios