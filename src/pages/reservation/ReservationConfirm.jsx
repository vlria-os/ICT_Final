import FullCalendar from '@fullcalendar/react';
import React, { useEffect, useRef, useState } from 'react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import jwtAxios from '../../api/jwtAxios';
import { useDispatch } from 'react-redux';

import { setDoctorId } from "../../store/sseSlice";
import './Reservation.css';

const ReservationConfirm = () => {
  const [slotBlocked, setSlotBlocked] = useState(false); // 수정
  const [blockMessage, setBlockMessage] = useState(""); // 수정

  const [department, setDepartment] = useState([]);
  const [doctor, setDoctor] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [status, setStatus] = useState("RECEIVED");
  const [currentMonth, setCurrentMonth] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const calendarRef = useRef(null);
  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(3);
  const queryClient = useQueryClient();
  const isRowClickRef = useRef(false);
  const dispatch = useDispatch();

  useEffect(() => {
    setPage(0);
  }, [debouncedName, selectedDept, status]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(name), 400);
    return () => clearTimeout(t);
  }, [name]);

  useEffect(() => {
    jwtAxios.get('http://localhost:8080/api/department/by-category?category=DOCTOR')
      .then(res => {
        console.log("부서 응답:", res.data);
        setDepartment(res.data.content ?? res.data ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setTimeSlots([]);
    setSlotBlocked(false); // 수정
    setBlockMessage(""); // 수정
  }, [selectedDept, selectedDoc]);

  useEffect(() => {
    if (!selectedDept) {
      setDoctor([]);
      return;
    }

    jwtAxios.get(`http://localhost:8080/api/staff/doctor?departmentId=${selectedDept}`)
      .then(res => {
        setDoctor(res.data.content ?? []);

        if (isRowClickRef.current) {
          isRowClickRef.current = false;
          return;
        }

        setSelectedDoc(null);
      })
      .catch(console.error);
  }, [selectedDept]);

  useEffect(() => {
    if (!currentMonth) return;
    if (!selectedDept) return;

    let url;
    let params;

    const isNextMonthOrLater = dayjs(currentMonth).isAfter(dayjs().endOf('month'));

    if (isNextMonthOrLater) {
      url = "http://localhost:8080/api/slot/department";
      params = { monthly: currentMonth, departmentId: selectedDept };
    } else {
      // 수정:
      // 이번 달은 의사가 선택된 경우만 의사 기준 조회
      // 선택 안 된 경우에도 달력은 부서 기준으로 그릴 수는 있지만,
      // 실제 슬롯 확인은 handleDateClick에서 막는다.
      url = selectedDoc
        ? "http://localhost:8080/api/slot/doctor"
        : "http://localhost:8080/api/slot/department";

      params = selectedDoc
        ? { monthly: currentMonth, doctorId: selectedDoc }
        : { monthly: currentMonth, departmentId: selectedDept };
    }

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        const slotEvents = data.map(slot => ({
          title: slot.available
            ? `가능 (${slot.totalCapacity}명)`
            : (slot.scheduleType || 'OFF'),
          start: slot.date,
          color: slot.available ? "#69a56b" : "#e5e7eb",
          textColor: slot.available ? "#fff" : "#9ca3af",
          allDay: true,
          extendedProps: {
            available: slot.available,
            blocked: !slot.available, // 수정
          }
        }));

        setEvents(slotEvents);
      })
      .catch(console.error);
  }, [selectedDoc, currentMonth, selectedDept]);

  const fetchReservationList = ({ status, dept, name, page }) => {
    let url = "http://localhost:8080/api/reservation";

    if (status === "PENDING") url += "/pending";
    if (status === "CONFIRMED") url += "/confirmed";

    return jwtAxios.get(url, {
      params: {
        department: dept || undefined,
        name: name,
        page: page,
        size: size
      }
    }).then(res => res.data);
  };

  const { data } = useQuery({
    queryKey: ['reservationList', status, selectedDept, debouncedName, page],
    queryFn: () => fetchReservationList({
      status,
      dept: selectedDept,
      name: debouncedName,
      page
    }),
    placeholderData: (prev) => prev,
  });

  const list = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleDateClick = (info) => {
    const clickedDate = info.dateStr;
    const dailyIso = clickedDate + "T00:00:00";
    const isNextMonthOrLater = dayjs(clickedDate).isAfter(dayjs().endOf('month'));

    setSelectedDate(clickedDate);

    // 수정:
    // 이번 달은 의사 선택 없으면 아예 슬롯 조회하지 않음
    if (!isNextMonthOrLater && !selectedDoc) {
      setSlotBlocked(true);
      setBlockMessage("의사를 선택해야 예약 가능 시간을 확인할 수 있습니다.");
      setTimeSlots([]);
      return;
    }

    setSlotBlocked(false);
    setBlockMessage("");

    const url = isNextMonthOrLater
      ? `http://localhost:8080/api/slot/daily/department`
      : `http://localhost:8080/api/slot/daily/doctor`;

    const params = isNextMonthOrLater
      ? { daily: dailyIso, departmentId: selectedDept }
      : { daily: dailyIso, doctorId: selectedDoc };

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];
        console.log("슬롯 응답 raw:", res.data);
        console.log("슬롯 data:", data);

        const allBlocked = data.length === 0 || data.every(slot => !slot.available);
        if (allBlocked) {
          setSlotBlocked(true);
          setBlockMessage("해당 날짜는 예약이 불가합니다.");
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
            available: slot ? slot.available : false
          });
        }

        setSlotBlocked(false);
        setBlockMessage("");
        setTimeSlots(slotsByHour);
      })
      .catch(console.error);
  };

  const handleDatesSet = (info) => {
    const d = info.view.currentStart;
    const realMonth = dayjs(d);
    const formatted = realMonth.format('YYYY-MM-01T00:00:00');

    setCurrentMonth(prev => prev === formatted ? prev : formatted);

    if (dayjs(formatted).isAfter(dayjs().endOf('month'))) {
      setSelectedDoc(null);
    }
  };

  const handleEventClick = (info) => {
    const dateStr = dayjs(info.event.start).format('YYYY-MM-DD');
    const dailyIso = dateStr + "T00:00:00";
    const isNextMonthOrLater = dayjs(dateStr).isAfter(dayjs().endOf('month'));

    setSelectedDate(dateStr);

    // 수정:
    // 이번 달 의사 미선택이면 여기서도 막기
    if (!isNextMonthOrLater && !selectedDoc) {
      setSlotBlocked(true);
      setBlockMessage("의사를 선택해야 예약 가능 시간을 확인할 수 있습니다.");
      setTimeSlots([]);
      return;
    }

    setSlotBlocked(false);
    setBlockMessage("");

    const url = isNextMonthOrLater
      ? `http://localhost:8080/api/slot/daily/department`
      : `http://localhost:8080/api/slot/daily/doctor`;

    const params = isNextMonthOrLater
      ? { daily: dailyIso, departmentId: selectedDept }
      : { daily: dailyIso, doctorId: selectedDoc };

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        if (!isNextMonthOrLater) {
          const allBlocked = data.length === 0 || data.every(slot => !slot.available);
          if (allBlocked) {
            setSlotBlocked(true);
            setBlockMessage("해당 의사는 선택한 날짜에 예약이 불가합니다.");
            setTimeSlots([]);
            return;
          }
        }

        const slotsByHour = [];
        for (let h = 9; h <= 17; h++) {
          if (h === 13) continue;
          const slot = data.find(s => new Date(s.startTime).getHours() === h);
          slotsByHour.push({
            hour: h,
            capacity: slot ? slot.capacity : 3,
            available: slot ? slot.available : true
          });
        }

        setSlotBlocked(false);
        setBlockMessage("");
        setTimeSlots(slotsByHour);
      })
      .catch(console.error);
  };

  const handleRowClick = (item) => {
    const docId = item.doctorId ?? null;
    isRowClickRef.current = true;

    setSelectedDept(item.departmentId);
    setSelectedDoc(docId);
    setSelectedRow(item.reservationId);

    const date = getDate(item)
      ? dayjs(getDate(item)).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');

    setSelectedDate(date);
    setTimeSlots([]);
    setSlotBlocked(false); // 수정
    setBlockMessage(""); // 수정

    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(date);
    }

    const dailyIso = date + "T00:00:00";
    const url = docId
      ? `http://localhost:8080/api/slot/daily/doctor`
      : `http://localhost:8080/api/slot/daily/department`;

    const params = docId
      ? { daily: dailyIso, doctorId: docId }
      : { daily: dailyIso, departmentId: item.departmentId };

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        const allBlocked = data.length === 0 || data.every(slot => !slot.available);

        if (allBlocked) {
          setSlotBlocked(true);
          setBlockMessage(
            docId
              ? "해당 의사는 선택한 날짜에 예약이 불가합니다."
              : "해당 날짜는 예약이 불가합니다."
          );
          setTimeSlots([]);
          return;
        }

        const slotsByHour = [];
        for (let h = 9; h <= 17; h++) {
          if (h === 13) continue;
          const slot = data.find(s => new Date(s.startTime).getHours() === h);
          slotsByHour.push({
            hour: h,
            capacity: slot ? slot.capacity : 3,
            available: slot ? slot.available : true
          });
        }

        setSlotBlocked(false);
        setBlockMessage("");
        setTimeSlots(slotsByHour);
      })
      .catch(console.error);
  };

  const handleSlotClick = (hour) => {
    if (!selectedRow) return alert("예약할 행을 선택하세요!");

    const isNextMonthOrLater = dayjs(currentMonth).isAfter(dayjs().endOf('month'));

    if (!isNextMonthOrLater && !selectedDoc) {
      return alert("이번 달 예약은 의사를 선택해야 합니다.");
    }

    const dateTime = `${selectedDate}T${hour}:00`;

    const payload = {
      reservationId: selectedRow,
      reservationDate: dateTime,
      doctorId: selectedDoc || null,
      departmentId: selectedDept
    };

    const request =
      status === "CONFIRMED"
        ? jwtAxios.put('http://localhost:8080/api/reservation', payload)
        : jwtAxios.post('http://localhost:8080/api/reservation/confirm', payload);

    request
      .then(() => {
        alert(status === "CONFIRMED" ? "예약 수정 완료!" : "예약 완료!");
        setSelectedRow(null);

        refreshSlots();
        queryClient.invalidateQueries({
          queryKey: ['reservationList']
        });
        refreshCalendar();

        if (selectedDoc) {
          dispatch(setDoctorId(selectedDoc));
        }
      })
      .catch(console.error);
  };

  const refreshCalendar = () => {
    if (!currentMonth) return;

    let url;
    let params;

    const isNextMonthOrLater = dayjs(currentMonth).isAfter(dayjs().endOf('month'));

    if (isNextMonthOrLater) {
      url = "http://localhost:8080/api/slot/department";
      params = { monthly: currentMonth, departmentId: selectedDept };
    } else {
      url = selectedDoc
        ? "http://localhost:8080/api/slot/doctor"
        : "http://localhost:8080/api/slot/department";

      params = selectedDoc
        ? { monthly: currentMonth, doctorId: selectedDoc }
        : { monthly: currentMonth, departmentId: selectedDept };
    }

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        const slotEvents = data.map(slot => ({
          title: slot.available
            ? `가능 (${slot.totalCapacity}명)`
            : (slot.scheduleType || 'OFF'),
          start: slot.date,
          color: slot.available ? "#69a56b" : "#e5e7eb",
          textColor: slot.available ? "#fff" : "#9ca3af",
          allDay: true,
          extendedProps: {
            available: slot.available,
            blocked: !slot.available
          }
        }));

        setEvents(slotEvents);
      })
      .catch(console.error);
  };

  const refreshSlots = () => {
    if (!selectedDate) return;

    const dailyIso = selectedDate + "T00:00:00";
    const isNextMonthOrLater = dayjs(selectedDate).isAfter(dayjs().endOf('month'));

    // 수정:
    // 이번 달 의사 미선택이면 새로고침 슬롯도 막음
    if (!isNextMonthOrLater && !selectedDoc) {
      setSlotBlocked(true);
      setBlockMessage("의사를 선택해야 예약 가능 시간을 확인할 수 있습니다.");
      setTimeSlots([]);
      return;
    }

    const url = isNextMonthOrLater
      ? `http://localhost:8080/api/slot/daily/department`
      : `http://localhost:8080/api/slot/daily/doctor`;

    const params = isNextMonthOrLater
      ? { daily: dailyIso, departmentId: selectedDept }
      : { daily: dailyIso, doctorId: selectedDoc };

    jwtAxios.get(url, { params })
      .then(res => {
        const data = res.data.content ?? [];

        if (!isNextMonthOrLater) {
          const allBlocked = data.length === 0 || data.every(slot => !slot.available);
          if (allBlocked) {
            setSlotBlocked(true);
            setBlockMessage("해당 의사는 선택한 날짜에 예약이 불가합니다.");
            setTimeSlots([]);
            return;
          }
        }

        const slotsByHour = [];
        for (let h = 9; h <= 17; h++) {
          if (h === 13) continue;

          const slot = data.find(s => new Date(s.startTime).getHours() === h);

          slotsByHour.push({
            hour: h,
            capacity: slot ? slot.capacity : 3,
            available: slot ? slot.available : true
          });
        }

        setSlotBlocked(false);
        setBlockMessage("");
        setTimeSlots(slotsByHour);
      })
      .catch(console.error);
  };

  const handleCancel = (reservationId) => {
    jwtAxios.get(`http://localhost:8080/api/reservation/delete?reservationId=${reservationId}`)
      .then(() => {
        alert("예약 취소 완료");
        setSelectedRow(null);
        setTimeSlots([]);

        let url = "http://localhost:8080/api/reservation";
        if (status === "PENDING") url += "/pending";
        if (status === "CONFIRMED") url += "/confirmed";

        jwtAxios.get(url, {
          params: selectedDept ? { department: selectedDept } : {}
        })
          .then(() => {})
          .catch(console.error);
      })
      .catch(console.error);
  };

  const getDate = (item) => {
    if (status === "RECEIVED") return item.preferredDate;
    return item.reservationDate;
  };

  return (
    <div style={container}>
      <div style={main}>
        <div style={card}>
          <div style={filterBox}>
            <div style={filterRow}>
              <span style={label}>진료과</span>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={select}
              >
                <option value="">과를 선택하세요.</option>
                {department.map(dep => (
                  <option key={dep.departmentId} value={dep.departmentId}>
                    {dep.departmentName}
                  </option>
                ))}
              </select>
            </div>

            {dayjs(currentMonth).isSame(dayjs(), 'month') && (
              <div style={filterRowCol}>
                <div style={radioGroup}>
                  <label
                    style={{
                      ...radioPill,
                      backgroundColor: selectedDoc === null ? "#1976d2" : "#f1f3f5",
                      color: selectedDoc === null ? "white" : "#333",
                    }}
                  >
                    <input
                      type="radio"
                      checked={selectedDoc === null}
                      onChange={() => setSelectedDoc(null)}
                      style={{ display: "none" }}
                    />
                    전체
                  </label>

                  {doctor.map(doc => (
                    <label
                      key={doc.staffId}
                      style={{
                        ...radioPill,
                        backgroundColor: selectedDoc === doc.staffId ? "#1976d2" : "#f1f3f5",
                        color: selectedDoc === doc.staffId ? "white" : "#333",
                      }}
                    >
                      <input
                        type="radio"
                        checked={selectedDoc === doc.staffId}
                        onChange={() => setSelectedDoc(doc.staffId)}
                        style={{ display: "none" }}
                      />
                      {doc.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={statusBar}>
            <button onClick={() => setStatus("RECEIVED")} style={btn}>신청</button>
            <button onClick={() => setStatus("PENDING")} style={btn}>가예약</button>
            <button onClick={() => setStatus("CONFIRMED")} style={btn}>확정</button>
          </div>

          <div style={searchBar}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 검색"
              style={searchInput}
            />
          </div>

          {list.length === 0 ? (
            <p>데이터 없음</p>
          ) : (
            <div style={listContainer}>
              {list.map(item => {
                const isSelected = selectedRow === item.reservationId;

                return (
                  <div
                    key={item.reservationId}
                    onClick={() => handleRowClick(item)}
                    style={{
                      ...listItem,
                      ...(isSelected ? selectedItem : {})
                    }}
                  >
                    <div style={rowTop}>
                      <div>
                        <span style={patientName}>{item.patientName}</span>
                        <span style={deptTag}>{item.departmentName}</span>
                      </div>

                      <span style={dateText}>
                        {getDate(item)
                          ? dayjs(getDate(item)).format('MM/DD HH:mm')
                          : '없음'}
                      </span>
                    </div>

                    <div style={rowMiddle}>
                      👨‍⚕️ {item.doctorName || '희망 의사 없음'}
                    </div>

                    <div style={rowBottom}>
                      <span style={symptom}>{item.symptom}</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(item.reservationId);
                        }}
                        style={cancelBtn}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={pagination}>
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={pageBtn}
            >
              이전
            </button>

            <span style={pageText}>
              {page + 1} / {totalPages}
            </span>

            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={pageBtn}
            >
              다음
            </button>
          </div>
        </div>

        <div style={calendarBox}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            fixedWeekCount={false}
            ref={calendarRef}
            validRange={{
              start: dayjs().format('YYYY-MM-DD')
            }}
            height="100%"
            dayCellClassNames={(info) => {
              const dateStr = dayjs(info.date).format('YYYY-MM-DD');
              return selectedDate === dateStr ? ['selected-day'] : [];
            }}
          />
        </div>

        <div style={slotContainer}>
          <div style={slotHeader}>
            {selectedDate
              ? dayjs(selectedDate).format('MM/DD (ddd)')
              : '날짜 선택'}
          </div>

          {slotBlocked ? (
            <div style={blockedBox}>
              <div style={blockedIcon}>⛔</div>
              <div style={blockedText}>{blockMessage || "해당 날짜는 예약 불가입니다."}</div>
            </div>
          ) : (
            timeSlots.map((slot) => {
              if(slot.hour === 13) return null;
              const disabled = !slot.available || slot.capacity === 0;

              return (
                <React.Fragment key={slot.hour}>
                  <div
                    onClick={() => {
                      if (!disabled) {
                        handleSlotClick(`${String(slot.hour).padStart(2, '0')}:00`);
                      }
                    }}
                    style={{
                      ...slotRow,
                      ...(disabled ? disabledRow : activeRow)
                    }}
                  >
                    <div style={timeText}>
                      {String(slot.hour).padStart(2, '0')}:00
                    </div>

                    <div style={statusText}>
                      {disabled ? '불가' : `가능 (${slot.capacity}명)`}
                    </div>
                  </div>

                  {slot.hour === 12 && (
                    <div style={dividerLine}>
                      <div style={line}></div>
                      <span style={dividerText}>점심시간</span>
                      <div style={line}></div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationConfirm;

const container = {
   padding: "20px",
  fontFamily: "Pretendard, sans-serif",
  background: "#f4f6fb",
  minHeight: "100vh",
};

const statusBar = {
  marginBottom: '15px'
};

const btn = {
  marginRight: "8px",
  padding: "8px 14px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
};


const filterBox = {
marginBottom: "20px",
  padding: "14px",
  background: "white",
  borderRadius: "12px",
  border: "1px solid #eee",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};


const filterRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const filterRowCol = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const label = {
  width: "60px",
  fontSize: "13px",
  color: "#666",
};

const select = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  outline: "none",
  fontSize: "13px",
};

const main = {
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  height: "calc(110vh - 140px)",
};

const card = {
  flex: 1,
  background: "white",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid #eee",
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
};

const calendarBox = {
  flex: 2,
  background: "white",
  borderRadius: "12px",
  padding: "12px",
  border: "1px solid #eee",
  height: "85%",
  minHeight: "600px",
};

const radioGroup = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const radioPill = {
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  cursor: "pointer",
  border: "1px solid #ddd",
  transition: "all 0.2s",
};

const searchBar = {
  marginBottom: "12px",
};

const searchInput = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  outline: "none",
  fontSize: "13px",
};

const cancelBtn = {
padding: "4px 10px",
  borderRadius: "6px",
  border: "none",
  background: "#ffebee",
  color: "#d32f2f",
  cursor: "pointer",
  fontSize: "12px",
};

const pagination = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
};

const pageBtn = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: "12px",
};

const pageText = {
  fontSize: "13px",
  color: "#555",
};
const listContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const listItem = {
  padding: "14px",
  borderRadius: "12px",
  background: "#fafafa",
  border: "1px solid #eee",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const selectedItem = {
  background: "#dbeafe",
  boxShadow: "0 0 0 2px #1976d2 inset",
};

const rowTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
};

const deptTag = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#1976d2",
};

const dateText = {
  fontSize: "12px",
  color: "#666",
};

const rowMiddle = {
  fontSize: "14px",
  marginBottom: "6px",
};

const rowBottom = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const symptom = {
  fontSize: "13px",
  color: "#444",
};

const patientName = {
  fontSize: "14px",
  fontWeight: 600,
  marginRight: "6px",
};

const slotContainer = {
  width: "280px",
  background: "white",
  borderRadius: "12px",
  padding: "12px",
  border: "1px solid #eee",
};

const slotHeader = {
  fontSize: "16px",
  fontWeight: 700,
  marginBottom: "10px",
};

const slotRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "6px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const activeRow = {
 background: "#e8f5e9",
  color: "#2e7d32",
  ':hover': {
    background: "#c8e6c9"
  }
};

const disabledRow = {
  background: "#f5f5f5",
  color: "#aaa",
  cursor: "not-allowed",
};

const timeText = {
  fontWeight: 600,
};

const statusText = {
  fontSize: "13px",
};

const dividerLine = {
  display: "flex",
  alignItems: "center",
  margin: "12px 0",
};

const line = {
  flex: 1,
  height: "1px",
  background: "#ddd",
};

const dividerText = {
  margin: "0 8px",
  fontSize: "12px",
  color: "#999",
};

const blockedBox = {
  padding: "20px",
  textAlign: "center",
  background: "#fff5f5",
  border: "1px solid #ffd6d6",
  borderRadius: "12px",
  color: "#d32f2f",
  fontWeight: "600",
};

const blockedIcon = {
  fontSize: "20px",
  marginBottom: "6px",
};

const blockedText = {
  fontSize: "13px",
};