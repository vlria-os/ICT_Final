import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react'
import { confirmPayment, getBillingList, insertTotalAmount, preparePayment } from '../../../api/billingApi';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const API_CLIENT_KEY=import.meta.env.VITE_TOSS_API_CLIENT_KEY;

const BillingList = ({ keyword }) => {
  const [page, setPage]=useState(0);
  const [sort, setSort]=useState("billingId,desc");
  const [openPaymentModal, setOpenPaymentModal]=useState(false);
  const [amount, setAmount]=useState("");
  const [totalAmount, setTotalAmount]=useState("");
  const [recordId, setRecordId]=useState("");
  const [name, setName]=useState("");
  const [billing, setBilling]=useState(null);
  const [paying, setPaying]=useState(false);
  const [openTotalAmountModal, setOpenTotalAmountModal]=useState(false);
  const [inputAmount, setInputAmount]=useState("");

  const [searchParams]=useSearchParams();
  const navigate=useNavigate();
  const queryClient=useQueryClient();

  useEffect(()=>{
    setPage(0);
  }, [keyword])

  useEffect(()=>{
    const paymentKey=searchParams.get("paymentKey");
    const orderId=searchParams.get("orderId");
    const amount=searchParams.get("amount");

    if(!paymentKey || !orderId || !amount) return;

    const confirm=async() => {
      try{
        await confirmPayment({
          paymentKey,
          orderId,
          amount: Number(amount)
        });

        alert("결제가 완료되었습니다.");

        queryClient.invalidateQueries({ queryKey: ["billingList"] });
        queryClient.invalidateQueries({ queryKey: ["paymentList"] });

        navigate("/billing", {replace:true});
      } catch(error) {
        console.log(error);
        alert("결제 승인 실패!");
        navigate("/billing", {replace:true});
      }
    };

    confirm();
  }, [searchParams, navigate, queryClient])

  const insertAmountMutation=useMutation({
    mutationFn: insertTotalAmount,
    onSuccess: () => {
      alert("총 금액이 변경되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['billingList'] });
      closeTotalAmountModal();
    },
    onError: (error) => {
      console.log(error);
      alert("총 금액 변경에 실패했습니다.");
    }
  });

  const { data, isLoading, isError }=useQuery({
    queryKey: ['billingList', keyword, page, sort],
    queryFn: () => getBillingList(page, sort, keyword)
  });

  const handlePayment=async() => {
    if(paying) return;
    setPaying(true);

    try{
      if(!billing) {
        alert("청구서 정보가 없습니다.");
        return;
      }

      const payAmount=Number(amount);

      if(!payAmount || payAmount <= 0){
        alert("결제 금액이 올바르지 않습니다.");
        return;
      }

      const prepare=await preparePayment({
        billingId: billing.billingId,
        amount: payAmount
      });

      const tossPayments=await loadTossPayments(
        API_CLIENT_KEY
      );

      const payment=tossPayments.payment({
        customerKey: `billing_${billing.billingId}`
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: prepare.amount
        },
        orderId: prepare.orderId,
        orderName: prepare.orderName,
        customerName: prepare.customerName,
        successUrl: `${window.location.origin}/billing`,
        failUrl: `${window.location.origin}/billing`
      });

      closePaymentModal();
    }catch(error){
      console.log(error);
      alert("결제를 진행할 수 없습니다.");
    }finally{
      setPaying(false);
    }
  }

  const closePaymentModal = () => {
    setOpenPaymentModal(false);
    setBilling(null);
    setName("");
    setTotalAmount("");
    setRecordId("");
    setAmount("");
  };

  const closeTotalAmountModal=()=>{
    setOpenTotalAmountModal(false);
    setBilling(null);
    setInputAmount("");
  }

  if(isLoading){
    return <div>청구 목록 불러오는 중...</div>;
  }

  if(isError){
    return <div>청구 목록을 불러오지 못했습니다!</div>
  }

  return (
    <div className='billing-list'>
      <div className='billing-sort-area'>
        <div className='billing-sort-box'>
          <select className='billing-sort-select' value={sort}
            onChange={(e)=>setSort(e.target.value)}>
            <option value='billingId,desc'>최신순</option>
            <option value='billingId,asc'>등록순</option>
          </select>
        </div>
      </div>
      <div className='billing-table-area'>
        <table className='billing-table'>
          <thead>
            <tr>
              <th>번호</th><th>환자</th><th>접수 번호</th>
              <th>총 금액</th><th>처리 현황</th>
              <th>결제</th>
            </tr>
          </thead>
          <tbody>
            {
              data?.content?.length === 0 ? (
                <tr>
                  <td colSpan={6}>조회된 청구서가 없습니다!</td>
                </tr>
              ) : (
                data?.content?.map((billing, index) => {
                  return (
                    <tr key={billing.billingId}>
                    <td>{(page * 10) + index + 1}</td><td>{billing.patientName}</td>
                    <td>{billing.receptionId}</td>
                    <td className='billing-table-total-amount-td'>
                      {
                        billing.totalAmount === null ? (
                          <div className='total-amount-is-null'>
                            <button
                              type='button' className='total-amount-insert-btn'
                              onClick={() => {
                                setBilling(billing);
                                setInputAmount("");
                                setOpenTotalAmountModal(true);
                              }}
                            >
                              입력
                            </button>
                          </div>
                        ) : (
                          <div className='unpaid-td-box'>
                            <div className='unpaid-td-total-amount'>
                              {billing.totalAmount}
                            </div>
                            {
                              billing.status === 'PENDING' && (
                                <div className='unpaid-td-update-box'>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setBilling(billing);
                                      setInputAmount(billing.totalAmount);
                                      setOpenTotalAmountModal(true);
                                    }}
                                    className='unpaid-td-update-btn'
                                  >
                                    수정
                                  </button>
                                </div>
                              )
                            }
                          </div>
                        )
                      }
                    </td>
                    <td>{billing.status}</td>
                    <td>
                      <button type='button'
                        disabled={(billing.status !== 'PENDING' && billing.status !== 'PARTIAL') || billing.totalAmount === null}
                        onClick={()=>{
                          setAmount("");
                          setBilling(billing);
                          setName(billing.patientName);
                          setTotalAmount(billing.totalAmount);
                          setRecordId(billing.receptionId);
                          setOpenPaymentModal(true);
                        }}
                        >
                        결제
                      </button>
                    </td>
                  </tr>
                  )
                })
              )
            }
          </tbody>
        </table>
      </div>
      <div className='billing-paging-area'>
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
      {
        openPaymentModal && (
          <div className='payment-modal-overlay' onClick={(e)=>{
            e.preventDefault();
            closePaymentModal();
          }}>
            <div className='payment-modal-inner' onClick={(e)=>e.stopPropagation()}>
              <div className='payment-modal-body'>
                <div className='payment-modal-header'>
                  <button type='button' onClick={()=>{
                      closePaymentModal();
                    }}
                  className='payment-modal-close-btn'>
                    x
                  </button>
                </div>
                <div className='payment-modal-main'>
                  <div>
                    <p><b>환자</b> {name}</p>
                    <p><b>진료 번호</b> {recordId}</p>
                    <p><b>총 금액</b> {totalAmount}</p>
                  </div>
                  <div>
                    <input type='number' value={amount}
                      onChange={(e)=>setAmount(e.target.value)}/>
                  </div>
                </div>
                <div className='payment-modal-footer'>
                  <button type='button' className='cash-btn'>현금 결제</button>
                  <button type='button' className='card-btn'
                    onClick={handlePayment}>
                      {paying ? '처리 중':'전자 결제'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {
        openTotalAmountModal && (
          <div className='totalAmount-modal-overlay'
            onClick={(e) => {
              e.preventDefault();
              closeTotalAmountModal();
            }}>
            <div className='totalAmount-modal-inner'
              onClick={(e)=>e.stopPropagation()}>
              <div className='totalAmount-modal-box'>
                <div className='totalAmount-modal-header'>
                  {billing?.receptionId}번 접수 건의 총 금액을 입력하세요.
                </div>
                <div className='input-amount-area'>
                  <input type='number' value={inputAmount}
                    onChange={(e)=>setInputAmount(e.target.value)}/>
                </div>
                <div className='totalAmount-modal-footer'>
                  <button type='button' className='totalAmount-modal-close-btn'
                    onClick={()=>closeTotalAmountModal()}>
                    취소
                  </button>
                  <button type='button'
                    onClick={() => {
                      if(!billing) {
                        alert("청구서 정보가 없습니다.");
                        return;
                      }

                      const amount=Number(inputAmount);

                      if(!amount || amount <= 0){
                        alert("금액이 올바르지 않습니다.");
                        return;
                      }

                      insertAmountMutation.mutate({
                        billingId: billing.billingId,
                        totalAmount: amount
                      });
                    }}
                    disabled={insertAmountMutation.isPending}
                  >
                    {insertAmountMutation.isPending ? '진행 중':'확인'}
                  </button>
                </div>
              </div>
            </div>
        </div>
      )
    }
  </div>
  )
}

export default BillingList