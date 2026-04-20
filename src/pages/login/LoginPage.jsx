import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginPost } from '../../api/userApi'
import { loginSuccess } from '../../store/authSlice'
import "./loginPage.css"
import { useMutation } from '@tanstack/react-query'
import { socialUserLogin } from '../../api/socialLoginApi'

export const NAVER_API_URL = import.meta.env.VITE_NAVER_LOGIN_API_URL;
export const KAKAO_CLIENT_ID=import.meta.env.VITE_KAKAO_CLIENT_ID;
export const KAKAO_REDIRECT_URI=import.meta.env.VITE_KAKAO_REDIRECT_URI;

const LoginPage = () => {
  const [email, setEmail]=useState("");
  const [password, setPassword]=useState("");
  const [searchParams]=useSearchParams();
  const [called, setCalled]=useState(false);

  const dispatch=useDispatch();
  const navigate=useNavigate();

  const naverLoginMutation=useMutation({
    mutationFn: socialUserLogin,
    onSuccess: (result) => {
        dispatch(loginSuccess(result));
        console.log("res", result);
        console.log("session ==> ", sessionStorage.getItem("userId"));
        alert("네이버 로그인 성공!");
        navigate("/", {replace:true});
    },
    onError: (error) => {
        alert("네이버 로그인 실패!");
        console.log(error);
    }
  });

  const kakaoLoginMutation=useMutation({
    mutationFn: socialUserLogin,
    onSuccess: (result) => {
        dispatch(loginSuccess(result));
        console.log("res", result);
        console.log("session ==> ", sessionStorage.getItem("userId"));
        alert("카카오 로그인 성공!");
        navigate("/", {replace:true});
    },
    onError: (error) => {
        alert("카카오 로그인 실패!");
        console.log(error);
    }
  });

  useEffect(()=>{
    const mode=searchParams.get("mode");

    if(!called && mode === 'naverLogin'){
        setCalled(true);
        naverLoginMutation.mutate();
    } else if(!called && mode === 'kakaoLogin'){
        setCalled(true);
        kakaoLoginMutation.mutate();
    }

  }, [searchParams])

  const handleLogin=async()=>{
    try{
        const data=await loginPost({"email":email, "password":password});
        alert("로그인 성공!");
        dispatch(loginSuccess(data));    
        setEmail("")
        setPassword("")
        navigate("/", {replace:true})
    }catch (error){
        console.log(error);
        const data=error.response?.data;

        if(data?.error === "SOCIAL_LOGIN_ONLY"){
            const providers=data.providers || [];
            const providerNames=providers.map(p => {
                if(p === 'NAVER') return "네이버";
                if(p === 'KAKAO') return "카카오";
                return p;
            });

            alert(`소셜 로그인 전용 계정입니다. ${providerNames.join(", ")} 로그인을 이용해 주세요`);
            return;
        }

        alert("로그인 실패!");
    }
  }

  const handleNaverLogin=()=>{
    window.location.href=NAVER_API_URL;
  };

  const handleKakaoLogin=()=>{
    const url=
        `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;

    window.location.href=url;
  }

  return (
    <div className='login-panel'>
        <div className='login-area'>
            <div className='login-header'>
                <h1>회원 로그인</h1>
            </div>
            <div className='login-main'>
                <form className='login-form'>
                    <div className='login-input-box'>
                        <label>이메일</label>
                        <input type='email' value={email}
                            onChange={(e)=>{setEmail(e.target.value)}}
                            placeholder='이메일을 입력하세요'
                            className='login-input'/>
                    </div>
                    <div className='login-input-box'>
                        <label>비밀번호</label>
                        <input type='password' value={password}
                            onChange={(e)=>{setPassword(e.target.value)}}
                            placeholder='비밀번호를 입력하세요'
                            className='login-input'/>
                    </div>
                    <div className='login-button-box'>
                        <div className='local-login'>
                            <button type='button' onClick={handleLogin}
                                className='local-login-btn'>
                                    로그인
                            </button>
                        </div>
                        <div className='naver-login'>
                            <button type='button' className='naver-login-btn'
                                onClick={handleNaverLogin}>
                                네이버 로그인
                            </button>
                        </div>
                        <div className='kakao-login'>
                            <button type='button' className='kakao-login-btn'
                                onClick={handleKakaoLogin}>
                                카카오 로그인
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <div className='login-footer'>
                <div className='join-box'>
                    <span>아직 계정이 없으신가요?</span>
                    <button type='button'
                        className='join-page-btn'
                        onClick={()=>{
                            navigate("/join", {replace: true});
                        }}
                    >
                        회원 가입
                    </button>
                </div>
            </div>
        </div>
    </div>
  )
}

export default LoginPage