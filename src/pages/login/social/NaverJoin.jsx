import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react'
import { rrnCheck } from '../../../api/joinApi';
import { getNaverUserInfo, naverLogin } from '../../../api/socialLoginApi';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../../store/authSlice';
import "./naverJoin.css"

const NaverJoin = () => {
  const [rrn, setRrn]=useState("");
  const [rrnChecked, setRrnChecked]=useState(false);
  const [rrnCheckResult, setRrnCheckResult]=useState("");

  const dispatch=useDispatch();
  const navigate=useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['naverUserInfo'],
    queryFn: getNaverUserInfo
  });

  const rrnCheckMutation=useMutation({
    mutationFn: rrnCheck,
    onSuccess: (result) => {
      if(result === 'REGISTERED_USER'){
          setRrnCheckResult("로컬 계정이 존재합니다. 기존 계정에 소셜 로그인 정보가 연동됩니다.");
          setRrnChecked(true);
        } else if(result === 'SOCIAL_USER'){
            setRrnCheckResult("기존 소셜 로그인 정보가 존재합니다. 기존 계정에 새로운 소셜 로그인 정보가 추가됩니다.");
            setRrnChecked(true);
        } else if(result === 'UNREGISTERED_USER'){
            setRrnCheckResult("환자 정보가 존재합니다. 소셜 로그인 계정 생성 후 환자 정보가 연동됩니다.");
            setRrnChecked(true);
        } else {
            setRrnCheckResult("가입 가능한 주민등록번호입니다.");
            setRrnChecked(true);
        }
    },
    onError: (error) => {
      console.log(error);
        setRrnCheckResult("오류가 발생했습니다.");
        setRrnChecked(false);
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

  const naverLoginMutation=useMutation({
    mutationFn: naverLogin,
    onSuccess: (result) => {
      dispatch(loginSuccess(result));
      console.log("session ==> ", sessionStorage.getItem("userId"));
      alert("네이버 로그인 성공!");
      navigate("/", {replace:true})
    },
    onError: (error) => {
      console.log(error);
      alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
      navigate("/login", {replace:true});
    }
  });

  const handleLogin=()=>{
    if(!rrn) {
      setRrnCheckResult("주민등록번호를 입력하세요.");
      return;
    }

    if(!rrnChecked){
      setRrnCheckResult("주민등록번호를 조회하세요.");
      return;
    }

    naverLoginMutation.mutate({
      providerId:data.providerId,
      provider: data.provider,
      name: data.name,
      rrn: rrn,
      gender: data.gender ? data.gender : null,
      mobile: data.mobile ? data.mobile : null
    });
  }

  if (isLoading) {
    return <div className='naver-login-panel'>
      <div className='naver-login-box'>
        <div className='naver-login-is-loading'>
          로딩 중...........
        </div>
      </div>
    </div>
  };
  if (isError) {
    return <div className='naver-login-panel'>
      <div className='naver-login-box'>
        <div className='naver-login-is-error'>
          네이버 사용자 정보를 불러오지 못했습니다.
        </div>
      </div>
    </div>
  };

  return (
    <div className='naver-login-panel'>
      <div className='naver-login-box'>
        <div className='naver-login-header'>
          <p>Naver 소셜 로그인</p>
        </div>
        <div className='naver-login-form-box'>
          <form className='naver-login-form'>
            <div className='naver-name-box'>
              <label>이름</label>
              <input type='text' value={data?.name || "이름 정보가 없습니다."} readOnly/>
            </div>
            <div className='naver-rrn-box'>
              <label>주민등록번호</label>
              <input type='text' placeholder='숫자만 입력하세요'
                maxLength={13}
                value={rrn} onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setRrn(value);
                  setRrnChecked(false);
                  setRrnCheckResult("");
                }}/>
              <button type='button'
                className='naver-rrn-btn' disabled={!rrn || rrnChecked || rrnCheckMutation.isPending}
                onClick={handleRrnCheck}>
                  {rrnCheckMutation.isPending ? '조회 중':'주민등록번호 조회'}
              </button>
            </div>
            {
              rrnCheckResult && (
                <div className='naver-rrn-result-box'>
                  <p className='naver-rrn-result'>{rrnCheckResult}</p>
                </div>
              )
            }
            {
              data?.mobile && (
                <div className='naver-phone-box'>
                  <label>전화번호</label>
                  <input type='text' value={data?.mobile} readOnly/>
                </div>
              )
            }
            {
              data?.gender && (
                <div className='naver-gender-box'>
                  <label>성별</label>
                  <select value={data?.gender || ""} disabled>
                    <option value={data?.gender}>
                      {data?.gender === 'F' ? '여성' : '남성'}
                    </option>
                  </select>
                </div>
              )
            }
            <div className='naver-login-btn-box'>
              <button type='button'
                className='naver-join-btn'
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

export default NaverJoin