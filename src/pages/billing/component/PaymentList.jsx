import React, { useEffect, useState } from 'react'
import { getPaymentList } from '../../../api/billingApi';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

const PaymentList = ({ keyword }) => {
  const [page, setPage]=useState(0);
  const [sort, setSort]=useState("paymentDatetime,desc");

  useEffect(()=>{
    setPage(0);
  }, [keyword])

  const { data, isLoading, isError }=useQuery({
    queryKey: ['paymentList', keyword, page, sort],
    queryFn: () => getPaymentList(page, sort, keyword)
  });

  if(isLoading){
    return <div>결제 목록 불러오는 중...</div>;
  }

  if(isError){
    return <div>결제 목록을 불러오지 못했습니다!</div>
  }

  return (
    <div className='payment-list'>
        <div className='payment-sort-area'>
            <div className='payment-sort-box'>
                <select className='payment-sort-select' value={sort}
                    onChange={(e)=>setSort(e.target.value)}>
                        <option value='paymentDatetime,desc'>최신순</option>
                        <option value='paymentDatetime,asc'>등록순</option>
                </select>
            </div>
        </div>
        <div className='billing-table-area'>
            <table className='billing-table'>
                <thead>
                    <tr>
                        <th>번호</th><th>환자</th><th>진료 번호</th>
                        <th>결제 금액</th><th>결제 방식</th><th>결제일</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        data?.content?.length === 0 ? (
                            <tr>
                                <td colSpan={6}>조회된 결제 내역이 없습니다!</td>
                            </tr>
                        ) : (
                            data?.content?.map((payment, index) => (
                            <tr key={payment.paymentId}>
                                <td>{(page * 10) + index + 1}</td>
                                <td>{payment.patientName}</td><td>{payment.receptionId}</td>
                                <td>{payment.amount}</td><td>{payment.method}</td>
                                <td>{dayjs(payment.paymentDatetime).format('YYYY년 M월 D일 H시 m분 s초')}</td>
                            </tr>
                            ))
                        )
                    }
                </tbody>
            </table>
        </div>
        <div className='payment-paging-area'>
            <button type='button' onClick={() => setPage(prev => prev - 1)}
                disabled={data?.first}>
                    이전
            </button>
            <span>
                {data?.content ? `${data.number + 1}`:''}
            </span>
            <button type='button' onClick={()=>setPage(prev => prev + 1)}
                disabled={data?.last}>
                    다음
            </button>
        </div>
    </div>
  )
}

export default PaymentList