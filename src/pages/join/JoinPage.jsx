import React, { useState } from 'react'
import { emailCheck, join, rrnCheck } from '../../api/joinApi';
import { useNavigate } from 'react-router-dom';
import "./joinPage.css"
import { useMutation } from '@tanstack/react-query';

export const heightOptions=[];

for(let i=1400; i <= 2500; i++){
    heightOptions.push((i/10).toFixed(1));
}

export const weightOptions=Array
                    .from({length: 241}, (_, i) => (30 + (i * 0.5)).toFixed(1));

const JoinPage = () => {
  const [email, setEmail]=useState("");
  const [password, setPassword]=useState("");
  const [checkedPwd, setCheckedPwd]=useState("");
  const [name, setName]=useState("");
  const [rrn, setRrn]=useState("");
  const [phone, setPhone]=useState("");
  const [address, setAddress]=useState("");
  const [gender, setGender]=useState("");
  const [bloodType, setBloodType]=useState("");
  const [height, setHeight]=useState("");
  const [weight,setWeight]=useState("");
  const [emailChecked, setEmailChecked]=useState(false);
  const [emailCheckResult, setEmailCheckResult]=useState("");
  const [rrnChecked, setRrnChecked]=useState(false);
  const [rrnCheckResult, setRrnCheckResult]=useState("");
  const [errors, setErrors]=useState({});

  const navigate=useNavigate();

  const emailCheckMutation=useMutation({
    mutationFn: emailCheck,
    onSuccess: (result) => {
        if(result === 'success'){
            setEmailCheckResult("사용 가능한 이메일입니다.");
            setEmailChecked(true);
        } else {
            setEmailCheckResult("이미 사용 중인 이메일입니다.");
            setEmailChecked(false);
        }
    },
    onError: (error) => {
        console.log(error);
        setEmailCheckResult("오류가 발생했습니다.");
        setEmailChecked(false);
    }
  });

  const handleEmailCheck=()=>{
    if(!email) {
        setEmailCheckResult("이메일을 입력하세요.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        setEmailCheckResult("이메일 형식이 올바르지 않습니다.");
        return;
    }

    emailCheckMutation.mutate(email);
  }

  const rrnCheckMutation=useMutation({
    mutationFn: rrnCheck,
    onSuccess: (result) => {
        if(result === 'REGISTERED_USER'){
            alert("이미 등록된 회원입니다. 기존 계정으로 로그인하세요.");
            navigate("/login", {replace:true});
        } else if (result === 'SOCIAL_USER'){
            alert("소셜 로그인 정보가 존재합니다. 소셜 계정으로 로그인하세요.");
            navigate("/login", {replace:true});
        } else if(result === 'UNREGISTERED_USER'){
            setRrnCheckResult("환자 정보가 존재합니다. 가입 후 자동으로 연동됩니다.");
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

  const validate=()=>{
    const newErrors={};

    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!email) newErrors.email="이메일을 입력하세요.";
    else if(!emailRegex.test(email)) newErrors.email="이메일 형식이 올바르지 않습니다.";

    if(!password) newErrors.password="비밀번호를 입력하세요.";
    if (!checkedPwd) newErrors.checkedPwd = "비밀번호 확인을 입력하세요.";
    if (password && checkedPwd && password !== checkedPwd) {
            newErrors.checkedPwdMatch = "비밀번호가 일치하지 않습니다.";
    }
    if(!name) newErrors.name="이름을 입력하세요.";

    if(!rrn) newErrors.rrn="주민등록번호를 입력하세요.";
    else if (!/^\d{13}$/.test(rrn)) newErrors.rrn2 = "주민등록번호 13자리를 입력하세요.";

    if(!emailChecked) newErrors.emailChecked="이메일 중복 여부를 확인하세요.";
    if(!rrnChecked) newErrors.rrnChecked="주민등록번호를 조회하세요";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  const joinMutation=useMutation({
    mutationFn: join,
    onSuccess: (result) => {
        if(result === 'REGISTERED_USER'){
            alert("회원 가입에 성공했습니다. 생성된 계정이 기존 환자 정보와 연동되었습니다.");
            navigate("/login", {replace:true});
        } else if (result === 'NEW_USER'){
            alert("회원 가입에 성공했습니다.");
            navigate("/login", {replace:true});
        }
    },
    onError: (error) => {
        console.log(error);
        alert("회원 가입에 실패했습니다. 다시 시도해 주세요.");
    }
  });

  const handleJoin=()=>{
    if(!validate()) return;

    joinMutation.mutate({
        email:email,
        password:password,
        name:name,
        rrn:rrn,
        phone:phone,
        address:address,
        gender:gender,
        bloodType:bloodType,
        height:height,
        weight:weight 
    });
  }

  const isPasswordMatched = checkedPwd !== "" && password === checkedPwd;

  return (
    <div className='join-panel'>
        <div className='join-area'>
            <div className='join-form-box'>
                <form className='join-form' onSubmit={(e) => {
                    e.preventDefault();
                    handleJoin();
                }}>
                    <div className='email-box'>
                        <label>이메일</label>
                        <input type='email' value={email}
                            onChange={(e)=>{
                                setEmail(e.target.value);
                                setEmailChecked(false);
                                setEmailCheckResult("");
                                setErrors((prev) => ({...prev, email:"", emailChecked:""}));
                            }}/>
                        <button type='button'
                            disabled={!email || emailChecked || emailCheckMutation.isPending}
                            onClick={handleEmailCheck}
                        >
                            {emailCheckMutation.isPending ? '확인 중':'중복 확인'}
                        </button>
                    </div>
                    {
                        errors.email && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.email}</p>
                            </div>
                        )
                    }
                    {
                        errors.emailChecked && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.emailChecked}</p>
                            </div>
                        )
                    }
                    {
                        emailCheckResult !== null && emailCheckResult !== "" && (
                            <div className='check-result-box'>
                                <p className='check-result'>{emailCheckResult}</p>
                            </div>
                        )
                    }
                    <div className='password-box'>
                        <label>비밀번호</label>
                        <input type='password' value={password}
                            onChange={(e)=>{
                                setPassword(e.target.value);
                                setErrors((prev) => ({ ...prev, password: "", checkedPwdMatch: ""}));
                            }}/>
                    </div>
                    {
                        errors.password && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.password}</p>
                            </div>
                        )
                    }
                    <div className='checkedPwd-box'>
                        <label>비밀번호 확인</label>
                        <input type='password' value={checkedPwd}
                            onChange={(e)=>{
                                setCheckedPwd(e.target.value);
                                setErrors((prev) => ({ ...prev, checkedPwd: "", checkedPwdMatch: ""}));
                            }}/>
                    </div>
                    {
                        errors.checkedPwd && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.checkedPwd}</p>
                            </div>
                        )
                    }
                    {
                        errors.checkedPwdMatch && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.checkedPwdMatch}</p>
                            </div>
                        )
                    }
                    {
                        checkedPwd !== "" && (
                            <div className='check-password-box'>
                                <p className={`check-password-text ${isPasswordMatched 
                                    ? 'success' : 'fail'}`}>
                                    {
                                        isPasswordMatched 
                                        ? '비밀번호가 일치합니다.' 
                                        : '비밀번호가 일치하지 않습니다.'
                                    }
                                </p>
                            </div>
                        )
                    }
                    <div className='name-box'>
                        <label>이름</label>
                        <input type='text' value={name}
                            onChange={(e)=>{
                                setName(e.target.value);
                                setErrors((prev) => ({ ...prev, name: "" }));
                            }}/>
                    </div>
                    {
                        errors.name && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.name}</p>
                            </div>
                        )
                    }
                    <div className='rrn-box'>
                        <label>주민등록번호</label>
                        <input type='text' placeholder='숫자만 입력하세요'
                            maxLength={13}
                            value={rrn} onChange={(e)=>{
                                const value = e.target.value.replace(/\D/g, "");
                                setRrn(value);
                                setRrnChecked(false);
                                setRrnCheckResult("");
                                setErrors((prev) => ({ ...prev, rrn: "", rrn2: "", rrnChecked: "" }));
                            }}/>
                        <button type='button'
                            disabled={!rrn || rrnChecked || rrnCheckMutation.isPending}
                            onClick={handleRrnCheck}
                        >
                            {rrnCheckMutation.isPending ? '조회 중':'주민등록번호 조회'}
                        </button>
                    </div>
                    {
                        errors.rrn && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.rrn}</p>
                            </div>
                        )
                    }
                    {
                        errors.rrn2 && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.rrn2}</p>
                            </div>
                        )
                    }
                    {
                        errors.rrnChecked && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.rrnChecked}</p>
                            </div>
                        )
                    }
                    {
                        rrnCheckResult !== null && rrnCheckResult !== "" && (
                            <div className='check-result-box'>
                                <p className='check-result'>{rrnCheckResult}</p>
                            </div>
                        )
                    }
                    <div className='phone-box'>
                        <label>전화번호</label>
                        <input type='text' placeholder='숫자만 입력하세요'
                            maxLength={11}
                            value={phone} onChange={(e)=>{
                                    const value = e.target.value.replace(/\D/g, "");
                                    setPhone(value);
                                    setErrors((prev) => ({ ...prev, phone: "" }));
                                }}/>
                    </div>
                    {
                        errors.phone && (
                            <div className='error-box'>
                                <p className='error-text'>{errors.phone}</p>
                            </div>
                        )
                    }
                    <div className='address-box'>
                        <label>주소</label>
                        <input type='text' value={address}
                            onChange={(e)=>setAddress(e.target.value)}/>
                    </div>
                    <div className='gender-box'>
                        <label>성별</label>
                        <select value={gender} onChange={(e)=>setGender(e.target.value)}>
                            <option value="">성별을 선택하세요</option>
                            <option value='F'>여성</option>
                            <option value='M'>남성</option>
                        </select>
                    </div>
                    <div className='blood-box'>
                        <label>혈액형</label>
                        <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
                            <option value="">혈액형을 선택하세요</option>
                            <option value='RH+ A'>RH+ A</option>
                            <option value='RH- A'>RH- A</option>
                            <option value='RH+ B'>RH+ B</option>
                            <option value='RH- B'>RH- B</option>
                            <option value='RH+ O'>RH+ O</option>
                            <option value='RH- O'>RH- O</option>
                            <option value='RH+ AB'>RH+ AB</option>
                            <option value='RH- AB'>RH- AB</option>
                        </select>
                    </div>
                    <div className='height-box'>
                        <label>신장</label>
                        <select value={height} onChange={(e)=>setHeight(e.target.value)}
                            className='height-select'>
                            <option value="">신장을 선택하세요</option>
                            {
                                heightOptions.map((h) => (
                                    <option key={h} value={h}>
                                        {h}cm
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    <div className='weight-box'>
                        <label>체중</label>
                        <select value={weight} onChange={(e)=>setWeight(e.target.value)}
                            className='weight-select'>
                            <option value="">체중을 선택하세요</option>
                            {
                                weightOptions.map((w) => (
                                    <option key={w} value={w}>
                                        {w}kg
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    <div className='submit-box'>
                        <button type='submit' className='submit-btn'
                            disabled={joinMutation.isPending}>
                            {joinMutation.isPending ? '처리 중':'가입'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  )
}

export default JoinPage