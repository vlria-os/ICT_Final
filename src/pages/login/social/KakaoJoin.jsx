import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react'
import { rrnCheck } from '../../../api/joinApi';
import { getKakaoUserInfo, kakaoLogin } from '../../../api/socialLoginApi';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../store/authSlice';
import "./kakaoJoin.css"

const KakaoJoin = () => {
  const [name, setName]=useState("");
  const [nameCheckResult, setNameCheckResult]=useState("");
  const [rrn, setRrn]=useState("");
  const [rrnChecked, setRrnChecked]=useState(false);
  const [rrnCheckResult, setRrnCheckResult]=useState("");

  const dispatch=useDispatch();
  const navigate=useNavigate();

  const { data, isLoading, isError }=useQuery({
    queryKey: ['kakaoUserInfo'],
    queryFn: getKakaoUserInfo
  });

  const rrnCheckMutation=useMutation({
    mutationFn: rrnCheck,
    onSuccess: (result) => {
      console.log("rrnCheck success:", result);

        switch (result) {
            case "REGISTERED_USER":
                setRrnCheckResult("로컬 계정이 존재합니다. 기존 계정에 소셜 로그인 정보가 연동됩니다.");
                setRrnChecked(true);
                break;
            case "SOCIAL_USER":
                setRrnCheckResult("기존 소셜 로그인 정보가 존재합니다. 기존 계정에 새로운 소셜 로그인 정보가 추가됩니다.");
                setRrnChecked(true);
                break;
            case "UNREGISTERED_USER":
                setRrnCheckResult("환자 정보가 존재합니다. 소셜 로그인 계정 생성 후 환자 정보가 연동됩니다. (이름은 기존 환자 정보의 이름으로 유지됩니다.)");
                setRrnChecked(true);
                break;
            case "NEW_USER":
                setRrnCheckResult("가입 가능한 주민등록번호입니다.");
                setRrnChecked(true);
                break;
            default:
                setRrnCheckResult(`알 수 없는 응답: ${result}`);
                setRrnChecked(false);
        }
    },
    onError: (error) => {
      console.log(error);
        setRrnCheckResult("오류가 발생했습니다.");
        setRrnChecked(false);
    }
  });

  const kakaoLoginMutation=useMutation({
    mutationFn: kakaoLogin,
    onSuccess: (result) => {
        dispatch(loginSuccess(result));
        console.log("session ==> ", sessionStorage.getItem("userId"));
        alert("카카오 로그인 성공!");
        navigate("/", {replace:true});
    },
    onError: (error)=>{
        console.log(error);
        alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
        navigate("/login", {replace:true});
    }
  });

  const handleRrnCheck=()=>{
    if(!rrn) {
        setRrnCheckResult("주민등록번호를 입력하세요");
        return;
    }

    if (!/^\d{13}$/.test(rrn)) {
        setRrnCheckResult("주민등록번호 13자리를 입력하세요.");
        return;
    }

    rrnCheckMutation.mutate(rrn);
  }

  const handleLogin=()=>{
    if(!name){
        setNameCheckResult("이름을 입력하세요.");
        return;
    }

    if(!rrn){
        setRrnCheckResult("주민등록번호를 입력하세요.");
        return;
    }

    if(!rrnChecked){
        setRrnCheckResult("주민등록번호를 조회하세요.");
        return;
    }

    kakaoLoginMutation.mutate({
        provider: data.provider,
        providerId: data.providerId,
        name: name,
        rrn: rrn
    });
  }

  if (isLoading) {
    return <div className='kakao-login-panel'>
      <div className='kakao-login-box'>
        <div className='kakao-login-is-loading'>
          로딩 중...........
        </div>
      </div>
    </div>
  };
  if (isError) {
    return <div className='kakao-login-panel'>
      <div className='kakao-login-box'>
        <div className='kakao-login-is-error'>
          카카오 사용자 정보를 불러오지 못했습니다.
        </div>
      </div>
    </div>
  };
  
  return (
    <div className='kakao-login-panel' translate='no'>
        <div className='kakao-login-box'>
            <div className='kakao-login-header'>
                <p>KAKAO 소셜 로그인</p>
            </div>
            <div className='kakao-login-form-box'>
                <form className='kakao-login-form'>
                    <div className='kakao-name-box'>
                        <label>이름</label>
                        <input type='text' value={name} onChange={(e) => {
                            setNameCheckResult("");
                            setName(e.target.value);
                        }}/>
                    </div>
                    {
                        nameCheckResult && (
                            <div className='kakao-login-name-result-box'>
                                <p className='kakao-login-name-result'>
                                    {nameCheckResult}
                                </p>
                            </div>
                        )
                    }
                    <div className='kakao-rrn-box'>
                        <label>주민등록번호</label>
                        <input type='text' placeholder='숫자만 입력하세요'
                            maxLength={13} value={rrn}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setRrnCheckResult("");
                                setRrnChecked(false);
                                setRrn(value);
                            }}/>
                        <button type='button' className='kakao-login-rrn-btn'
                            disabled={!rrn || rrnChecked || rrnCheckMutation.isPending}
                            onClick={handleRrnCheck} translate='no'>
                            {rrnCheckMutation.isPending ? '조회 중':'주민등록번호 조회'}
                        </button>
                    </div>
                    {
                        rrnCheckResult && (
                            <div className='kakao-rrn-result-box' translate='no'>
                                <p className='kakao-rrn-result'>{rrnCheckResult}</p>
                            </div>
                        )
                    }
                    <div className='kakao-login-btn-box'>
                        <button type='button'
                            className='kakao-login-button'
                            onClick={handleLogin}>
                            확인
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  )
}

export default KakaoJoin