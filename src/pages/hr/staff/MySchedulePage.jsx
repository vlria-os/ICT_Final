import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getMySchedule } from "../../../api/hr/staffScheduleApi";

const TYPE_COLORS = {
  DAY: "#3b82f6",
  NIGHT: "#6366f1",
  OFF: "#9ca3af",
  EVENING: "#f59e0b",
};

const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getMonthRange = (dateStr) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
};

const STATUS_LABEL = { CONFIRMED: "확정", TEMP: "임시" };

const MySchedulePage = () => {
  const [scheduleList, setScheduleList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [currentMonth, setCurrentMonth] = useState(getTodayString());
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef(null);

  const fetchSchedule = async (monthDate) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getMonthRange(monthDate);
      const data = await getMySchedule({ startDate, endDate, size: 100 });
      setScheduleList(data.content ?? []);
    } catch (err) {
      console.error("내 스케줄 조회 실패", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(currentMonth);
  }, [currentMonth]);

  const events = useMemo(() =>
    scheduleList.map((item) => ({
      title: item.typeName,
      date: item.workDate,
      backgroundColor: TYPE_COLORS[item.typeCode] ?? "#6b7280",
      borderColor: "transparent",
      extendedProps: { ...item },
    })),
    [scheduleList]
  );

  const selectedDaySchedules = useMemo(() =>
    scheduleList.filter((item) => item.workDate === selectedDate),
    [scheduleList, selectedDate]
  );

  const staffName = scheduleList[0]?.staffName ?? "";
  const departmentName = scheduleList[0]?.departmentName ?? "";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>내 스케줄</h2>
          {staffName && (
            <p style={styles.subInfo}>{staffName} · {departmentName}</p>
          )}
        </div>
        {loading && <span style={styles.loading}>불러오는 중...</span>}
      </div>

      <div style={styles.content}>
        <div style={styles.calendar}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            headerToolbar={{
              left: "",
              center: "title",
              right: "prev,next",
            }}
            datesSet={(info) => {
              const midDate = new Date((info.start.getTime() + info.end.getTime()) / 2);
              const mid = `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, "0")}-01`;
              setCurrentMonth(mid);
            }}
            dateClick={(info) => setSelectedDate(info.dateStr)}
            height="auto"
            fixedWeekCount={false}
            dayMaxEvents={3}
          />
        </div>

        <div style={styles.detail}>
          <h3 style={styles.detailTitle}>{selectedDate} 일정</h3>
          {selectedDaySchedules.length === 0 ? (
            <p style={styles.empty}>해당 날짜에 스케줄이 없습니다.</p>
          ) : (
            selectedDaySchedules.map((item) => (
              <div key={item.scheduleId} style={styles.card}>
                <div
                  style={{
                    ...styles.badge,
                    backgroundColor: TYPE_COLORS[item.typeCode] ?? "#6b7280",
                  }}
                >
                  {item.typeName}
                </div>
                <div style={styles.cardBody}>
                  <span style={styles.cardDept}>{item.departmentName}</span>
                  <span style={styles.cardStatus}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
              </div>
            ))
          )}

          <div style={styles.legend}>
            {Object.entries(TYPE_COLORS).map(([code, color]) => (
              <div key={code} style={styles.legendItem}>
                <span style={{ ...styles.dot, backgroundColor: color }} />
                <span>{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySchedulePage;

const styles = {
  container: { padding: "24px" },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  subInfo: { margin: "4px 0 0", color: "#6b7280", fontSize: "14px" },
  loading: { color: "#9ca3af", fontSize: "14px" },
  content: { display: "flex", gap: "24px", alignItems: "flex-start" },
  calendar: {
    flex: "1 1 0",
    background: "#fff",
    borderRadius: "8px",
    padding: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  detail: {
    width: "260px",
    flexShrink: 0,
    background: "#fff",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  detailTitle: { margin: "0 0 12px", fontSize: "15px", fontWeight: 600 },
  empty: { color: "#9ca3af", fontSize: "14px" },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "10px 12px",
    marginBottom: "8px",
  },
  badge: {
    display: "inline-block",
    color: "#fff",
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "12px",
    marginBottom: "6px",
  },
  cardBody: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#374151",
  },
  cardDept: { fontWeight: 500 },
  cardStatus: { color: "#6b7280" },
  legend: {
    marginTop: "20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "#6b7280",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
};
