import axios from "axios";
import store from "../store/store";
import { updateToken, logout } from "../store/authSlice";

export const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL;

const jwtAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const beforeRequest = (config) => {
  const accessToken = sessionStorage.getItem("accessToken");
  console.log("beforeRequest ===>", accessToken);

  if (!accessToken) {
    return Promise.reject({
      response: {
        status: 401,
        data: {
          error: "REQUIRED_LOGIN",
        },
      },
    });
  }

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
}
const refreshJWT=async(accessToken)=>{
    console.log("jwtAxios accessToken=========>", accessToken)

    const res=await axios.post(`${API_BASE_URL}/jwt/token/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
    );
    
    console.log("refresh => ", res);
    return res.data;
}

const beforeResponse=async(res)=>{
    return res;
}

const requestFail=(error)=>{
    return Promise.reject(error);
}

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (accessToken) => {
  refreshSubscribers.forEach((cb) => cb(accessToken));
  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach((cb) => cb(null, error));
  refreshSubscribers = [];
};

const responseFail=async(error)=>{
  const errorRes = error.response;
  console.log("responseFail 진입 ===>", errorRes?.status, errorRes?.data);

  if (errorRes && errorRes.status === 401) {
    const data = errorRes.data;
    console.log("401 data ===>", data);

    if (data && data.error === "ERROR_ACCESS_TOKEN") {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((accessToken, refreshError) => {
            if (refreshError || !accessToken) {
              reject(refreshError || error);
              return;
            }

            error.config.headers = error.config.headers ?? {};
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            resolve(jwtAxios(error.config));
          });
        });
      }

      isRefreshing = true;

      try {
        let accessToken=sessionStorage.getItem("accessToken");
        console.log("jwtAxios before refresh ===>", accessToken);

        const result = await refreshJWT(accessToken);
        console.log("refresh result ===>", result);

        accessToken = result.accessToken;

        if (!accessToken) {
          throw new Error("재발급 응답에 accessToken 없음");
        }

        console.log("jwtAxios after refresh ===>", accessToken);

        sessionStorage.setItem("accessToken", accessToken);
        store.dispatch(updateToken({ accessToken }));

        onRefreshed(accessToken);

        const originalRequest = error.config;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return jwtAxios(originalRequest);
      } catch (refreshError) {
        console.log("refresh 실패 ===>", refreshError);

        sessionStorage.removeItem("accessToken");
        store.dispatch(logout());

        onRefreshFailed(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  }

  return Promise.reject(error);
};

jwtAxios.interceptors.request.use(beforeRequest, requestFail);
jwtAxios.interceptors.response.use(beforeResponse, responseFail);

export default jwtAxios;