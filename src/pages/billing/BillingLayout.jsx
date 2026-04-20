import React, { useEffect, useState } from 'react'
import BillingList from './component/BillingList'
import PaymentList from './component/PaymentList'
import './billingLayout.css';
import { useNavigate } from 'react-router-dom';

const BillingLayout = () => {
  const [keyword, setKeyword]=useState("");
  const [searchInput, setSearchInput]=useState("");

  const navigate=useNavigate();
  const accessToken=sessionStorage.getItem('accessToken');
  const roles = sessionStorage.getItem("roles") || [];
  const departmentId=sessionStorage.getItem("departmentId");
  
  useEffect(()=>{
    if(!accessToken){
        navigate("/login", {replace:true});
    }
  
    if(roles.includes("PATIENT")){
        navigate("/", {replace:true});
    }

    if(Number(departmentId) !== 16){
      navigate("/", {replace:true});
    }
  },[])

  const handleSearch=()=>{
    setKeyword(searchInput.trim());
  }

  return (
    <div className='Billing-Layout'>
        <div className='Billing-Search-Area'>
          <div className='search-form'>
            <input type='text' placeholder='접수 번호와 환자 이름으로 검색해 보세요.'
              value={searchInput} onChange={(e)=>setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter'){
                  handleSearch();
                }
              }}/>
            <button type='button' onClick={handleSearch}>검색</button>
          </div>
        </div>
        <div className='Billing-Component'>
          <BillingList keyword={keyword}/>
          <PaymentList keyword={keyword}/>
        </div>
    </div>
  )
}

export default BillingLayout