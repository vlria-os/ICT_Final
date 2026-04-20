import React, { useEffect, useMemo, useState } from "react";

// Date 객체를 yyyy-mm-dd 형식 문자열로 변환
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 오늘 날짜 문자열 반환
function getTodayString() {
  return formatDate(new Date());
}

const WeekScheduleTable = ({
  staffList = [],
  scheduleList = [],
  scheduleTypeList = [],
  selectedDate,
  title,
}) => {

  const [currentWeek, setCurrentWeek] = useState(
    selectedDate || getTodayString()
  );

  // 부모에서 선택 날짜가 바뀌면 현재 주 기준 날짜도 같이 변경
  useEffect(() => {
    if (selectedDate) {
      setCurrentWeek(selectedDate);
    }
  }, [selectedDate]);

  // 현재 주의 일요일 ~ 토요일 날짜 7개 생성
  const weekDates = useMemo(() => {
    const today = new Date(currentWeek);
    const day = today.getDay();

    const start = new Date(today);
    start.setDate(today.getDate() - day);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      return {
        label: `${mm}/${dd}`,
        date: `${yyyy}-${mm}-${dd}`,
        dayName: ["일", "월", "화", "수", "목", "금", "토"][d.getDay()],
      };
    });
  }, [currentWeek]);

  // 근무유형 ID -> 근무유형 정보 매핑
  const typeMap = useMemo(() => {
    const map = {};

    scheduleTypeList.forEach((type) => {
      map[type.scheduleTypeId] = type;
    });

    return map;
  }, [scheduleTypeList]);

  // 이번 주 날짜 집합
  const weekDateSet = useMemo(() => {
    return new Set(weekDates.map((d) => d.date));
  }, [weekDates]);

  // 직원별 / 날짜별 근무유형을 빠르게 찾기 위한 맵
  const scheduleMap = useMemo(() => {
    const map = {};

    scheduleList.forEach((schedule) => {
      const staffId = schedule.staffId;
      const workDate = schedule.workDate;

      // 이번 주 날짜가 아니면 제외
      if (!weekDateSet.has(workDate)) return;

      const typeInfo = typeMap[schedule.scheduleTypeId];
      const typeName = typeInfo?.typeName || typeInfo?.typeCode || "";

      if (!map[staffId]) {
        map[staffId] = {};
      }

      map[staffId][workDate] = typeName;
    });

    return map;
  }, [scheduleList, typeMap, weekDateSet]);

  // 이전 주 / 다음 주 이동
  const moveWeek = (diff) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + diff * 7);
    setCurrentWeek(formatDate(d));
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.topBar}>
        <button type="button" onClick={() => moveWeek(-1)}>
          이전 주
        </button>

        <div style={styles.weekTitle}>
          {weekDates[0]?.date} ~ {weekDates[6]?.date}
        </div>

        <button type="button" onClick={() => moveWeek(1)}>
          다음 주
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...styles.th, ...styles.staffHeader }}>
              직원명(직원번호)
            </th>

            <th colSpan={7} style={styles.th}>
              {title || "전체부서"}
            </th>
          </tr>

          <tr>
            {weekDates.map((day) => (
              <th key={day.date} style={styles.th}>
                <div>{day.dayName}</div>
                <div style={styles.dateText}>{day.label}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {staffList.map((staff) => (
            <tr key={staff.staffId}>
              <td style={{ ...styles.td, ...styles.staffCell }}>
                {staff.name} ({staff.staffId})
              </td>

              {weekDates.map((day) => {
                const type = scheduleMap[staff.staffId]?.[day.date] || "";

                return (
                  <td key={day.date} style={styles.td}>
                    {type ? (
                      <span
                        style={{
                          ...styles.badge,
                          
                        }}
                      >
                        {type}
                      </span>
                    ) : (
                      <span style={styles.emptyText}>-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {staffList.length === 0 && (
            <tr>
              <td colSpan={8} style={styles.emptyRow}>
                직원 데이터가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WeekScheduleTable;

const styles = {
  wrapper: {
    width: "100%",
    overflowX: "auto",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  weekTitle: {
    fontWeight: "bold",
    fontSize: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
    tableLayout: "fixed",
  },
  th: {
    borderBottom: "1px solid #ddd",
    borderRight: "1px solid #eee",
    padding: "12px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    fontWeight: "bold",
    fontSize: "14px",
  },
  td: {
    borderBottom: "1px solid #eee",
    borderRight: "1px solid #f3f4f6",
    padding: "12px",
    textAlign: "center",
    height: "56px",
    fontSize: "14px",
  },
  staffHeader: {
    minWidth: "140px",
    maxWidth: "140px",
    width: "140px",
  },
  staffCell: {
    fontWeight: "bold",
    backgroundColor: "#fafafa",
    minWidth: "140px",
    maxWidth: "140px",
    width: "140px",
  },
  dateText: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
  },
  badge: {
    display: "inline-block",
    minWidth: "70px",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
  },
  emptyText: {
    color: "#9ca3af",
  },
  emptyRow: {
    padding: "20px",
    textAlign: "center",
    color: "#6b7280",
  },
};