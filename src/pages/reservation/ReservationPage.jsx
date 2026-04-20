import React, { useEffect, useState } from 'react'
import jwtAxios from '../../api/jwtAxios';
import styles from './ReservationPage.module.css';

const ReservationPage = () => {
  const [department,setDepartment]=useState([]);
  const [doctor,setDoctor]=useState([]);
  const [selectedDoc,setSelectedDoc]=useState("");
  const [selectedDept,setSelectedDept]=useState("");
  const [selectedDate,setSelectedDate]=useState("");
  const [symptom, setSymptom] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(()=>{
      jwtAxios.get('http://localhost:8080/api/department/by-category?category=DOCTOR').then((res) => {
          setDepartment(res.data.content ?? res.data ?? []);
        })
        .catch((err) => {
          console.error(err)
        })
    },[])

  useEffect(()=>{
    if (!selectedDept) {
      setDoctor([]); 
      setSelectedDoc(""); 
      return;
    }

    jwtAxios.get(`http://localhost:8080/api/staff/doctor?departmentId=${selectedDept}`)
      .then((res) => {
        setDoctor(res.data.content)
        console.log(res.data.content)
      })
      .catch((err) => console.error(err));
  },[selectedDept])

  // 날짜 or 의사/부서 변경 시 시간 슬롯 로드
  useEffect(() => {
    setSelectedTime("");
    setTimeSlots([]);

    if (!selectedDate || !selectedDept) return;

    const dailyIso = selectedDate + "T00:00:00";
    const url = selectedDoc
      ? "http://localhost:8080/api/slot/daily/doctor"
      : "http://localhost:8080/api/slot/daily/department";
    const params = selectedDoc
      ? { daily: dailyIso, doctorId: selectedDoc }
      : { daily: dailyIso, departmentId: selectedDept };

    setSlotsLoading(true);
    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        if (data.length === 0 || data.every(s => !s.available)) {
          setTimeSlots([]);
          return;
        }

        const slotsByHour = [];
        for (let h = 9; h <= 17; h++) {
          if (h === 13) continue;
          const slot = data.find(s => new Date(s.startTime).getHours() === h);
          slotsByHour.push({
            hour: h,
            capacity: slot ? slot.capacity : 0,
            available: slot ? slot.available : false,
          });
        }
        setTimeSlots(slotsByHour);
      })
      .catch(err => console.error("슬롯 조회 실패:", err))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedDoc, selectedDept]);

  const submitHandler = () => {
    const reservationData = {
      doctorId: selectedDoc || null, 
      departmentId: selectedDept,
      preferredDate: selectedDate
              ? selectedDate + (selectedTime ? `T${selectedTime}:00` : "T00:00:00")
              : null,
      symptom: symptom
    };

    jwtAxios.post('http://localhost:8080/api/reservation', reservationData)
      .then(res => {
        alert('예약이 완료되었습니다. 예약번호: '+res.data.reservationId);
        setSelectedDept("");
        setSelectedDoc("");
        setSelectedDate("");
        setSelectedTime("");
        setSymptom("");
        setTimeSlots([]);
      })
      .catch(err => {
        console.error('예약 실패:', err);
        alert('예약에 실패했습니다.');
      });
  };

  return (
      <div className={styles.reservationContainer}>
        <h1 className={styles.reservationTitle}>예약</h1>

        <form>
          <div className={styles.formGroup}>
            <label className={styles.label}>진료과</label>
            <select
              className={styles.select}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">선택하세요</option>
              {department.map(dep => (
                <option key={dep.departmentId} value={dep.departmentId}>
                  {dep.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>희망 의사</label>
            <select
              className={styles.select}
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(Number(e.target.value))}
            >
              <option value="">희망 의사 없음</option>
              {doctor.map(doc => (
                <option key={doc.staffId} value={doc.staffId}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>희망 날짜</label>
            <input
              className={styles.input}
              type="date"
              value={selectedDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime("");
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>희망 시간</label>
            {!selectedDate || !selectedDept ? (
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: "4px 0" }}>
                진료과와 날짜를 선택하면 예약 가능한 시간이 표시됩니다.
              </p>
            ) : slotsLoading ? (
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0" }}>로딩 중...</p>
            ) : timeSlots.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#ef4444", margin: "4px 0" }}>예약 가능한 시간이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {timeSlots.map(slot => {
                  const timeStr = `${String(slot.hour).padStart(2, "0")}:00`;
                  const isSelected = selectedTime === timeStr;
                  const disabled = !slot.available || slot.capacity === 0;
                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTime(timeStr)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #1976d2" : "1px solid #d1d5db",
                        background: disabled ? "#f3f4f6" : isSelected ? "#dbeafe" : "#fff",
                        color: disabled ? "#9ca3af" : isSelected ? "#1d4ed8" : "#374151",
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: isSelected ? "bold" : "normal",
                      }}
                    >
                      {timeStr}
                      {!disabled && (
                        <span style={{ fontSize: "11px", marginLeft: "4px", color: "#6b7280" }}>
                          ({slot.capacity}명)
                        </span>
                      )}
                      {disabled && (
                        <span style={{ fontSize: "11px", marginLeft: "4px" }}>불가</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>증상</label>
            <textarea
              className={styles.textarea}
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              rows={4}
              placeholder="증상을 자세히 입력해주세요"
            />
          </div>

          <button
            className={styles.button}
            type="button"
            onClick={submitHandler}
          >
            예약하기
          </button>
        </form>
      </div>
  )
}

export default ReservationPage