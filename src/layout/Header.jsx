// src/layout/Header.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import jwtAxios from "../api/jwtAxios";

const Header = () => {
  const userId=useSelector(state => state.auth.userId);
  const userName =useSelector(state => state.auth.name);

  const dispatch=useDispatch();
  const navigate=useNavigate();

  const handleLogInAndOut = async() => {
    if(!userId){
      navigate("/login", {replace:true})
    } else {
      try{
         console.log("🔥 버튼 클릭됨");
        await jwtAxios.post("http://localhost:8080/logout");
        dispatch(logout())
        alert("로그아웃 성공!");
        navigate("/", {replace:true});
      }catch(error){
        console.log(error);
        alert("로그아웃 실패!");
      }
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">Hospital ERP</h2>
      </div>

      <div className="header-right">
        <span className="header-user">{userName ? userName : ""}</span>
        <button className="logout-btn" onClick={handleLogInAndOut}>
          {
            userId ? '로그아웃' : '로그인'
          }
        </button>
      </div>
    </header>
  );
};

export default Header;