import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import jwtAxios from '../../api/jwtAxios';

const ReceptionPage = () => {
    const [status, setStatus]=useState("");
    const [name, setName]=useState("");
    const [debouncedName, setDebouncedName] = useState("");
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    
    useEffect(() => {
      setPage(0);
    }, [status, debouncedName]);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedName(name);
      }, 500);

      return () => clearTimeout(timer);
    }, [name]);

    const confirmedHandler=async(receptionId)=>{
        await jwtAxios.get(`http://localhost:8080/api/administration/recieved?receptionId=${receptionId}`).then((res) => {
            alert("접수 완료")
            queryClient.invalidateQueries({ queryKey: ['receptionList'] });
        })
        .catch((err) => {
            console.error(err)
        })
    }

    const cancelHandler=async (reservationId)=>{
      await jwtAxios.get(`http://localhost:8080/api/reception/cancel?reservationId=${reservationId}`).then((res) => {
            alert("취소 완료")
            queryClient.invalidateQueries({ queryKey: ['receptionList'] });
        })
        .catch((err) => {
            console.error(err)
        })
    }

    const fetchReceptionList = async ({ status, name, page }) => {
      const res = await jwtAxios.get('http://localhost:8080/api/reception', {
        params: {
          status: status || undefined,
          name: name,
          page: page,
          size: 3
        }
      });
      return res.data;
    };

    const { data , isLoading } = useQuery({
      queryKey: ['receptionList', status, debouncedName, page],
      queryFn: () => fetchReceptionList({ status, name: debouncedName, page }),
      placeholderData: (prev) => prev, 
    });

    const list = data?.content ?? [];
    const totalPages = data?.totalPages ?? 0;

    const statusBadge = (status) => {
      const base = {
        padding: "4px 8px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 600
      };

      const map = {
        PENDING: { background: "#fff3cd", color: "#856404" },
        RECEIVED: { background: "#d1ecf1", color: "#0c5460" },
        CONSULTING: { background: "#e2e3ff", color: "#383d7c" },
        COMPLETED: { background: "#d4edda", color: "#155724" }
      };

      return { ...base, ...(map[status] || {}) };
    };

    const statusTabs = [
      { key: "", label: "전체" },
      { key: "PENDING", label: "미접수" },
      { key: "RECEIVED", label: "접수" },
      { key: "CONSULTING", label: "진료중" },
      { key: "COMPLETED", label: "완료" }
    ];

  return (
    <div style={container}>
        <div style={wrapper}>
        <h1>접수</h1>
      {/* 상태 버튼 */}
      <div style={tabWrapper}>
        {statusTabs.map(tab => {
          const active = status === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              style={{
                ...tabBtn,
                ...(active ? tabActive : {})
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

        <div style={{ marginBottom: "12px" }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="환자 이름 검색"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #ddd"
          }}
        />
      </div>

        {isLoading && <p>불러오는 중...</p>}
        <div style={listContainer}>
          {list.map(item => (
            <div key={item.receptionId} style={card}>
              
              <div style={cardTop}>
                <span style={patient}>{item.patientName}</span>
                <span style={statusBadge(item.status)}>
                  {item.status}
                </span>
              </div>

              <div style={cardMiddle}>
                👨‍⚕️ {item.doctorName}
              </div>

              <div style={cardBottom}>
                🕒 {item.reservationDate}
              </div>

              <div style={btnRow}>
                <button
                  onClick={() => confirmedHandler(item.receptionId)}
                  style={confirmBtn}
                >
                  접수
                </button>

                <button
                  onClick={() => cancelHandler(item.reservationId)}
                  style={cancelBtn}
                >
                  취소
                </button>
              </div>

            </div>
          ))}
        </div>
        

      <div style={paginationWrapper}>
        <button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          style={{
            ...pageBtn,
            ...(page === 0 ? disabledBtn : {})
          }}
        >
          이전
        </button>

        <span style={pageInfo}>
          {page + 1} / {totalPages}
        </span>

        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(p => p + 1)}
          style={{
            ...pageBtn,
            ...(page + 1 >= totalPages ? disabledBtn : {})
          }}
        >
          다음
        </button>
      </div>

    </div>
    
        </div>
  )
}

const paginationWrapper = {
  marginTop: "16px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px"
};

const pageBtn = {
  padding: "6px 14px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: "13px",
  transition: "0.2s",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const disabledBtn = {
  opacity: 0.4,
  cursor: "not-allowed"
};

const pageInfo = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#333",
  minWidth: "60px",
  textAlign: "center"
};

const listContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const card = {
  padding: "14px",
  borderRadius: "12px",
  background: "white",
  border: "1px solid #eee",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px"
};

const patient = {
  fontSize: "15px",
  fontWeight: 600
};

const cardMiddle = {
  fontSize: "13px",
  marginBottom: "4px"
};

const cardBottom = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "10px"
};

const btnRow = {
  display: "flex",
  gap: "8px",
  justifyContent: "flex-end"
};

const confirmBtn = {
  padding: "6px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#1976d2",
  color: "white",
  cursor: "pointer",
  fontSize: "12px"
};

const cancelBtn = {
  padding: "6px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#ffebee",
  color: "#d32f2f",
  cursor: "pointer",
  fontSize: "12px"
};

const container = {
  maxWidth: "800px",   // 핵심
  margin: "0 auto",    // 가운데 정렬
  padding: "20px",
  background: "#f4f6fb",
  minHeight: "100vh"
};

const wrapper = {
  background: "white",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
};

const title = {
  marginBottom: "16px"
};

const searchBox = {
  marginBottom: "16px"
};

const pagination = {
  marginTop: "16px",
  display: "flex",
  justifyContent: "center",
  gap: "10px"
};

const tabWrapper = {
  display: "flex",
  border: "1px solid #ddd",
  borderRadius: "10px",
  overflow: "hidden",
  marginBottom: "12px"
};

const tabBtn = {
  flex: 1,
  padding: "8px 0",
  border: "none",
  background: "white",
  cursor: "pointer",
  fontSize: "13px",
  transition: "0.2s"
};

const tabActive = {
  background: "#1976d2",
  color: "white",
  fontWeight: "600"
};

export default ReceptionPage