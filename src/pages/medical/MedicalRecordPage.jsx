import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query';
import jwtAxios from '../../api/jwtAxios';

const MedicalRecordPage = () => {
      const queryClient = useQueryClient();
      const [selectedPat,setSelectedPat]=useState("");
      const [status, setStatus]=useState("DIAGNOSIS");
      const [page, setPage] = useState(0);
      const [size] = useState(3); 
      const [selectedRecord, setSelectedRecord] = useState(null);
      const [isAdding, setIsAdding] = useState(false);
      const [showReasonModal, setShowReasonModal] = useState(false);
      const [reason, setReason] = useState("");
      const [pendingRecord, setPendingRecord] = useState(null);
      const [waitingPage, setWaitingPage] = useState(0);
      const [waitingSize] = useState(3);
      const [showStatusModal, setShowStatusModal] = useState(false);
      const [pendingReceptionId, setPendingReceptionId] = useState(null);
      const [pendingPatientId, setPendingPatientId] = useState(null);
      const [waitingStatus, setWaitingStatus] = useState("");
      const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
      const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
      const [aiResult, setAiResult] = useState(null);
      const [showCompleteModal, setShowCompleteModal] = useState(false);
      const [searchKeyword, setSearchKeyword] = useState("");
      const [searchPage, setSearchPage] = useState(0);
      const [searchSize] = useState(3);
      const [searchData, setSearchData] = useState(null);
      const [isSearching, setIsSearching] = useState(false);
      const [newRecord, setNewRecord] = useState({
        title: "",
        symptom: "",
        content: "",
        isSensitive: false,
      });

      const handleSearch = async (newPage = 0) => {
        if (!searchKeyword || !selectedPat) return;

        const res = await jwtAxios.post(
          "http://localhost:8080/api/elastic/search",
          {
            patientId: selectedPat,
            keyword: searchKeyword,
            page: newPage,
            size: searchSize
          }
        );

        setSearchData(res.data);
        setSearchPage(newPage);
        setSelectedRecord(null); 
        setIsSearching(true);
      };

      const clearSearch = () => {
        setSearchKeyword("");
        setIsSearching(false);
        setSearchData(null);
      };

    const {data: waitingData} = useQuery({
      queryKey: ["medicalRecords", waitingStatus, waitingPage, waitingSize],
      queryFn: async () =>{
        const res = await jwtAxios.get("http://localhost:8080/api/waitingList",{
          params:{
            page: waitingPage,
            size: waitingSize,
              ...(waitingStatus && { status: waitingStatus })
          },
        });
        console.log(res.data);
        return res.data;
      }})

    const list = waitingData?.content || [];

    const { data: patientData } = useQuery({
      queryKey: ["patientInfo", selectedPat],
      queryFn: async () => {
        const res = await jwtAxios.get("http://localhost:8080/api/medicalrecord/patientInfo",
          {
            params: { patientId: selectedPat },
          }
        );
        return res.data;
      },
      enabled: !!selectedPat,
    });

    const {
      data: recordData,
      isLoading: recordLoading,
    } = useQuery({
      queryKey: ["medicalRecord", selectedPat, status, page],
      queryFn: async () => {
        const res = await jwtAxios.get("http://localhost:8080/api/medicalrecord/record", {
          params: {
            patientId: selectedPat,
            status: status,
            page: page,
            size: size,
          },
        });
        return res.data;
      },
      enabled: !!selectedPat && !!status,
    });

    const recordList = recordData?.content || [];

    const displayList = isSearching
  ? searchData?.content || []
  : recordList;

    const saveRecord = async () => {
      await jwtAxios.post("http://localhost:8080/api/medicalrecord", {
        patientId: selectedPat,
        medicalRecordStatus: status,
        title: newRecord.title,
        content: newRecord.content,
        symptom: newRecord.symptom,
        isSensitive: newRecord.isSensitive,
      });

      queryClient.invalidateQueries({ queryKey: ["medicalRecord"] });

      alert("추가 완료");

      setIsAdding(false);
      setNewRecord({ title: "", content: "", isSensitive: false });

      setShowCompleteModal(false);
      setPendingReceptionId(null);
    };

    const handleAdd = async () => {
      setPendingReceptionId(pendingReceptionId);
      setShowCompleteModal(true);
    };

    const handleConfirmYes = async () => {
      try {
        if (pendingReceptionId) {
          await jwtAxios.patch(
            "http://localhost:8080/api/reception/status",
            null,{
              params: {
                receptionId: pendingReceptionId,
                status: "COMPLETED",
              },});}
        await saveRecord();

      } catch (err) {
        console.error(err);
      }
    };

    const handleConfirmNo = async () => {
        try {
          await saveRecord();
        } catch (err) {
          console.error(err);
        }
      };

    const handleRecordClick = async (item) => {
        try {
          if (item.isSensitive) {
            setPendingRecord(item);
            setShowReasonModal(true);
            return;
          }

          const res = await jwtAxios.get(
            "http://localhost:8080/api/medicalrecord/record/detail", {
              params: {
                recordId: item.medicalRecordId,
                reason: null
              }});
            
              console.log(res.data);
          setSelectedRecord(res.data);

        } catch (err) {
          console.error(err);
        }
    };

      const handleSubmitReason = async () => {
        try {
          const res = await jwtAxios.get(
              "http://localhost:8080/api/medicalrecord/record/detail", {
                params: {
                  recordId: pendingRecord.medicalRecordId,
                  reason: reason
                }});

          setSelectedRecord(pendingRecord);
          setShowReasonModal(false);
          setReason("");
          setPendingRecord(null);

        } catch (err) {
          console.error(err);
          alert("열람 기록 저장 실패");
        }
      };

      const handleChangeToInProgress = async () => {
        try {
          await jwtAxios.patch("http://localhost:8080/api/reception/status", null, {
            params: {
              receptionId: pendingReceptionId,
              status: "CONSULTING",
            },
          });

          setShowStatusModal(false);
          setPendingReceptionId(null);
          setPendingPatientId(null);

          queryClient.invalidateQueries({ queryKey: ["medicalRecords"] });

        } catch (err) {
          console.error(err);
          alert("상태 변경 실패");
        }
      };

      const aiHandler= async ()=>{
        if (!newRecord.symptom) {
          alert("증상을 입력하세요");
          return;
        }
       try {
          const payload = {
            patientId: parseInt(selectedPat),
            departmentId: parseInt(selectedDepartmentId),
            departmentName: selectedDepartmentName,
            symptom: newRecord.symptom,
          };

          const res = await jwtAxios.post("http://localhost:8000/diagnose", payload, {
                                          headers: { "Content-Type": "application/json" }
                                        });
          const data = res.data;

          const warningText = `⚠️ 본 기록에는 AI 보조 진단 결과가 포함되어 있습니다.
          AI는 참고용이며, 최종 진단 및 치료 결정에 대한 책임은 담당 의사에게 있습니다.
          ----------------------------------------
          `;
                        
          setAiResult(data);
          setNewRecord(prev => ({
            ...prev,
            content: warningText + data.ai_diagnosis
          }));

        } catch (err) {
          console.error("AI 진단 오류:", err.response || err);
          alert("AI 진단 요청 실패");
        }
      }


      const isSearch = status === "SEARCH";

      const currentPage = isSearching ? searchPage : page;
      const totalPages = isSearching
        ? (searchData?.totalPages || 1)
        : (recordData?.totalPages || 1);

      const goPrev = () => {
        if (isSearch) handleSearch(searchPage - 1);
        else setPage(prev => prev - 1);
      };

      const goNext = () => {
        if (isSearch) handleSearch(searchPage + 1);
        else setPage(prev => prev + 1);
      };

  return (
    <div style={{  display: "flex",
                    gap: "20px",
                    padding: "20px",
                    backgroundColor: "#f5f7fa",
                    minHeight: "100vh"}}>
      <div style={{   width: "40%",
                      background: "white",
                      borderRadius: "12px",
                      padding: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h1>진료</h1>
        <div style={{
            display: "flex",
            gap: "8px",
            background: "#f1f3f5",
            padding: "6px",
            borderRadius: "10px",
            width: "fit-content"
          }}>
            <button
            onClick={() => { setWaitingStatus(""); setWaitingPage(0); }}
             style={tabBtn(waitingStatus === "" ? "active" : "non")}
          >
            전체
          </button>
          <button
            onClick={() => { setWaitingStatus("RECEIVED"); setWaitingPage(0); }}
             style={tabBtn(waitingStatus === "RECEIVED" ? "active" : "non")}
          >
            대기
          </button>
          <button
            onClick={() => { setWaitingStatus("CONSULTING"); setWaitingPage(0); }}
            style={tabBtn( waitingStatus === "CONSULTING" ? "active" : "non" )}
          >
            진료중
          </button>
          <button
            onClick={() => { setWaitingStatus("COMPLETED"); setWaitingPage(0); }}
            style={tabBtn(waitingStatus === "COMPLETED" ? "active" : "non" )}
          >
            완료
          </button>
        </div>
        
        <div style={{ marginTop: "10px" }}>
          {list.map((item) => (
            <div
              key={item.receptionId}
              onClick={() => {
                setPendingReceptionId(item.receptionId);
                setPendingPatientId(item.patientId);
                setSelectedPat(item.patientId);
                setSelectedDepartmentId(item.departmentId);
                setSelectedDepartmentName(item.departmentName);
                setShowStatusModal(item.status === "RECEIVED");
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px",
                borderRadius: "10px",
                marginBottom: "10px",
                background:
                  selectedPat === item.patientId ? "#dbeafe" : "#fafafa",
                border: "1px solid #eee",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              {/* 왼쪽 */}
              <div>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {item.patientName}
                </div>

                <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  예약번호 #{item.receptionId}
                </div>
              </div>

              {/* 👉 오른쪽 상태 */}
              <div style={{
                fontSize: "12px",
                padding: "5px 10px",
                borderRadius: "20px",
                fontWeight: "bold",
                background:
                  item.status === "PENDING"
                    ? "#fff3cd"
                    : item.status === "CONSULTING"
                    ? "#d1ecf1"
                    : "#d4edda",
                color:
                  item.status === "PENDING"
                    ? "#856404"
                    : item.status === "CONSULTING"
                    ? "#0c5460"
                    : "#155724"
              }}>
                {item.status === "RECEIVED" && "대기"}
                {item.status === "CONSULTING" && "진료중"}
                {item.status === "COMPLETED" && "완료"}
              </div>
            </div>
          ))}
        </div>


        <div style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px"
          }}>
            <button
              disabled={waitingPage === 0}
              onClick={() => setWaitingPage((prev) => prev - 1)}
              style={pageBtn(waitingPage === 0)}
            >
              이전
            </button>

            <span style={{
              fontSize: "14px",
              color: "#555",
              minWidth: "60px",
              textAlign: "center"
            }}>
              {waitingPage + 1} / {waitingData?.totalPages || 1}
            </span>

            <button
              disabled={waitingPage + 1 >= (waitingData?.totalPages || 1)}
              onClick={() => setWaitingPage((prev) => prev + 1)}
              style={pageBtn(waitingPage + 1 >= (waitingData?.totalPages || 1))}
            >
              다음
            </button>
          </div>
      </div>


      <div style={{
          width: "60%",
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>

        {patientData?.patient && (
        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          background: "#fafafa"
        }}>
          <h3 style={{ marginBottom: "10px", fontSize: "15px" }}>
            👤 환자 정보
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px"
          }}>

            <InfoItem label="이름" value={patientData.patient.name} />
            <InfoItem label="전화번호" value={patientData.patient.phone} />

            <InfoItem label="성별" value={patientData.patient.gender} />
            <InfoItem label="혈액형" value={patientData.patient.bloodType} />

            <InfoItem
              label="주소"
              value={patientData.patient.address}
              full
            />

            <InfoItem label="키" value={`${patientData.patient.height}cm`} />
            <InfoItem label="몸무게" value={`${patientData.patient.weight}kg`} />

          </div>
        </div>
      )}

     {!selectedPat ? (
      <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
        환자를 선택해주세요
      </div>
         ) : (
        <div>
          <h3>진료 기록</h3>

          <div style={{
            display: "flex",
            gap: "6px",
            marginBottom: "12px",
            borderBottom: "1px solid #eee",
            paddingBottom: "8px"
          }}>
            {["DIAGNOSIS","TEST","SURGERY","PRESCRIPTION","SEARCH"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(0); }}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderBottom: status === s ? "2px solid #1976d2" : "2px solid transparent",
                  background: "transparent",
                  color: status === s ? "#1976d2" : "#666",
                  fontWeight: status === s ? "bold" : "normal",
                  cursor: "pointer"
                }}
              >
                {{
                  DIAGNOSIS: "진료",
                  TEST: "검사",
                  SURGERY: "수술",
                  PRESCRIPTION: "처방"
                }[s]}
              </button>
            ))}

            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="검색"
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "13px"
              }}
            />

            <button onClick={() => handleSearch(0)} style={searchBtn}>
              검색
            </button>

            {isSearching && (
              <button onClick={clearSearch} style={resetBtn}>
                초기화
              </button>
            )}

            <div style={{ marginLeft: "auto" }}>
               {status !== "SEARCH" && (
              <button
                onClick={() => {
                  setIsAdding(true);
                  setSelectedRecord(null);
                }}
                style={primaryBtn}
              >
                + 추가
              </button>
               )}
            </div>
          </div>
        </div>

        {isAdding ? (
          <div style={{
            border: "1px solid #e5e7eb",
            padding: "20px",
            marginTop: "20px",
            borderRadius: "12px",
            background: "#fafafa"
          }}>
            <h3 style={{ marginBottom: "15px" }}>
              📝 새 기록 추가 ({status})
            </h3>

            {/* 제목 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>제목</label>
              <input
                type="text"
                value={newRecord.title}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, title: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            {/* 증상 */}
            {status === "DIAGNOSIS" && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <label style={labelStyle}>증상</label>

                  <button onClick={aiHandler} style={aiBtn}>
                    🤖 AI 진단
                  </button>
                </div>

                <textarea
                  value={newRecord.symptom}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, symptom: e.target.value })
                  }
                  rows={4}
                  style={textareaStyle}
                />
              </div>
            )}

            {/* 내용 */}
            <div style={{ marginBottom: "14px" }}>
              <textarea
                value={newRecord.content}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, content: e.target.value })
                }
                rows={5}
                style={textareaStyle}
              />
            </div>

            {/* 민감 여부 */}
            <div style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <input
                type="checkbox"
                checked={newRecord.isSensitive}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, isSensitive: e.target.checked })
                }
              />
              <span style={{ fontSize: "14px" }}>
                ⚠ 민감 정보 포함
              </span>
            </div>

            {/* 버튼 */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button onClick={() => setIsAdding(false)} style={cancelBtn}>
                취소
              </button>

              <button onClick={handleAdd} style={saveBtn}>
                저장
              </button>
            </div>
          </div>
        
      ):(
        <>
        {status === "SEARCH" && (
                    <>
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          marginBottom: "6px",
                          color: "#333"
                        }}>
                          🔍 진료 기록 검색
                        </div>

                        <div style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center"
                        }}>
                          <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="증상 / 내용 검색"
                            style={{
                              flex: 1,
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                              fontSize: "13px",
                              outline: "none"
                            }}
                            onFocus={e => e.target.style.border = "1px solid #1976d2"}
                            onBlur={e => e.target.style.border = "1px solid #ddd"}
                          />

                          <button
                            onClick={() => handleSearch(0)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "6px",
                              border: "none",
                              background: "#1976d2",
                              color: "white",
                              fontSize: "13px",
                              cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}
                          >
                            검색
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 테이블 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {displayList.map((item) => (
                      <div
                        key={item.medicalRecordId}
                        onClick={() => handleRecordClick(item)}
                        style={{
                          padding: "12px",
                          border: "1px solid #eee",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "0.2s",
                          background: "white"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "#f9fafb";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "white";
                        }}
                      >
                        {/* 👉 윗줄 (의사 + 날짜) */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div style={{ fontSize: "13px", color: "#888" }}>
                            {item.doctorName}
                          </div>

                          <div style={{ fontSize: "12px", color: "#aaa" }}>
                            {item.createAt
                              ? new Date(item.createAt).toLocaleDateString()
                              : ""}
                          </div>
                        </div>

                        {/* 👉 제목 */}
                        <div style={{ fontWeight: "bold", marginTop: "6px" }}>
                          {item.isSensitive ? "⚠ 민감 정보 포함" : item.title}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 페이징 */}
                  <div style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <button
                      disabled={currentPage === 0}
                      onClick={goPrev}
                      style={pageBtn(currentPage === 0)}
                    >
                      이전
                    </button>

                    <span style={{
                      fontSize: "13px",
                      color: "#666",
                      minWidth: "60px",
                      textAlign: "center"
                    }}>
                      {currentPage + 1} / {totalPages}
                    </span>

                    <button
                      disabled={currentPage + 1 >= totalPages}
                      onClick={goNext}
                      style={pageBtn(currentPage + 1 >= totalPages)}
                    >
                      다음
                    </button>
                  </div>

                  
                  <div style={{ marginTop: "20px" }}>
                  <h3>내용</h3>

                  <div style={{
                    marginTop: "20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "18px",
                    background: "#fafafa"
                  }}>
                    {selectedRecord ? (
                      <>
                        {/* 헤더 */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          borderBottom: "1px solid #eee",
                          paddingBottom: "8px"
                        }}>
                          <div style={{ fontWeight: "bold" }}>
                            {selectedRecord.departmentName} / {selectedRecord.doctorName}
                          </div>

                          <div style={{ fontSize: "13px", color: "#888" }}>
                            {new Date(selectedRecord.createAt).toLocaleString()}
                          </div>
                        </div>

                        {/* 제목 */}
                        <div style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          marginBottom: "10px"
                        }}>
                          {selectedRecord.title}
                        </div>

                        {/* 민감 */}
                        {selectedRecord.isSensitive && (
                          <div style={{
                            background: "#fff3cd",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            marginBottom: "10px"
                          }}>
                            ⚠ 민감 정보 포함
                          </div>
                        )}

                        {/* 내용 */}
                        <div style={{
                          lineHeight: "1.6",
                          fontSize: "14px",
                          whiteSpace: "pre-wrap"
                        }}>
                          <strong>증상:</strong> {selectedRecord.symptom || '-'} <br /><br />
                          {selectedRecord.content}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", color: "#aaa" }}>
                        기록을 선택하세요
                      </div>
                    )}
                </div>
              </div>
          </>
      )}

        {aiResult && (
          <div style={{
            marginTop: "20px",
            border: "1px solid #4CAF50",
            padding: "15px",
            borderRadius: "8px",
            backgroundColor: "#f6fff6"
          }}>
            <h3>🧠 AI 진단 결과</h3>

            <div style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.6",
              fontSize: "14px"
            }}>
              {aiResult.ai_diagnosis}
            </div>

            <h4 style={{ marginTop: "15px" }}>📌 추천 진료과</h4>
            <ul>
              {aiResult.agent_response.map((id) => (
                <li key={id}>진료과 ID: {id}</li>
              ))}
            </ul>
          </div>
        )}
        </div>
      )}

        {showReasonModal && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "400px"
            }}>
              <h3>⚠ 민감 정보 열람</h3>

              <p style={{ fontSize: "14px", color: "red" }}>
                이 기록은 민감 정보입니다.<br />
                열람 사유는 로그로 저장됩니다.
              </p>

              <textarea
                placeholder="열람 사유 입력"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", marginTop: "10px" }}
              />

              <div style={{ marginTop: "10px" }}>
                <button onClick={handleSubmitReason} disabled={!reason}>
                  확인
                </button>
                <button onClick={() => setShowReasonModal(false)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {showStatusModal && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "300px",
              textAlign: "center"
            }}>
              <h3>진료 시작</h3>
              <p>진료중으로 변경하시겠습니까?</p>

              <div style={{ marginTop: "10px" }}>
                <button onClick={handleChangeToInProgress}>
                  예
                </button>
                <button onClick={() => setShowStatusModal(false)}>
                  아니오
                </button>
              </div>
            </div>
          </div>
        )}

        {showCompleteModal && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"}}>
            <div style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "300px",
              textAlign: "center"}}>
              <h3>진료 완료</h3>
              <p>진료를 완료하시겠습니까?</p>

              <div>
                <button onClick={handleConfirmYes}>예</button>
                <button onClick={handleConfirmNo}>아니오</button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
  )
}

const tabBtn = (active) => ({
  padding: "6px 14px",
  borderRadius: "8px",
  border: "none",
  background: active ? "white" : "transparent",
  color: active ? "#1976d2" : "#555",
  fontWeight: active ? "bold" : "normal",
  cursor: "pointer",
  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
  transition: "0.2s"
});

const searchBtn = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#f1f3f5",
  color: "#333",
  cursor: "pointer",
  fontWeight: "bold",
  transition: "0.2s"
};

const resetBtn = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "white",
  color: "#666",
  cursor: "pointer",
  fontSize: "13px"
};

const primaryBtn = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "none",
  background: "#1976d2",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  transition: "0.2s"
};

const dangerBtn = {
  ...primaryBtn,
  background: "#f44336"
};

const pageBtn = (disabled) => ({
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  background: disabled ? "#f5f5f5" : "white",
  color: disabled ? "#aaa" : "#333",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "13px",
  transition: "0.15s"
});

const labelStyle = {
  fontSize: "13px",
  fontWeight: "bold",
  marginBottom: "4px",
  display: "block",
  color: "#444"
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  outline: "none"
};

const textareaStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  marginTop: "6px",
  resize: "vertical",
  outline: "none"
};

const aiBtn = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "none",
  background: "#ede9fe",
  color: "#5b21b6",
  fontSize: "12px",
  cursor: "pointer"
};

const saveBtn = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#1976d2",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer"
};

const cancelBtn = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "white",
  color: "#555",
  cursor: "pointer"
};

const InfoItem = ({ label, value, full }) => (
  <div style={{
    gridColumn: full ? "span 2" : "span 1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    border: "1px solid #eee",
    borderRadius: "6px",
    background: "white"
  }}>
    <span style={{
      fontSize: "13px",
      color: "#666"
    }}>
      {label}
    </span>

    <span style={{
      fontSize: "16px",
      fontWeight: "600",
      color: "#222"
    }}>
      {value || "-"}
    </span>
  </div>
);

export default MedicalRecordPage