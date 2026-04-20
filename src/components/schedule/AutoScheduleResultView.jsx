import React, { useMemo } from "react";

const shiftLabel = (type) => {
  const map = { DAY: "데이", EVENING: "이브닝", NIGHT: "나이트", OFF: "휴무" };
  return map[type] || type || "-";
};

const AutoScheduleResultView = ({
  assignments = [],
  unassigned = [],
  warnings = [],
  validationErrors = [],
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const groupedByDate = useMemo(() => {
    return assignments.reduce((acc, item) => {
      const date = item.workDate || "-";
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [assignments]);

  const sortedDates = Object.keys(groupedByDate).sort();
  const hasBlockingErrors = validationErrors.length > 0;

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>AI 생성 스케줄 미리보기</h3>
      <p style={styles.desc}>
        아래 스케줄을 확인 후 <strong>확정</strong>을 눌러주세요. 취소 시 저장되지 않습니다.
      </p>

      {hasBlockingErrors && (
        <div style={{ ...styles.alert, borderColor: "#f5c6cb", backgroundColor: "#fff5f5", color: "#c0392b" }}>
          <strong>생성 오류</strong>
          {validationErrors.map((err, i) => <div key={i} style={styles.alertItem}>• {err}</div>)}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ ...styles.alert, borderColor: "#ffd88a", backgroundColor: "#fffdf0", color: "#7d5a00" }}>
          <strong>경고 ({warnings.length}건)</strong>
          {warnings.map((w, i) => <div key={i} style={styles.alertItem}>• {w}</div>)}
        </div>
      )}

      {unassigned.length > 0 && (
        <div style={{ ...styles.alert, borderColor: "#ffd88a", backgroundColor: "#fffdf0", color: "#7d5a00" }}>
          <strong>미배정 직원 ({unassigned.length}명)</strong>
          <div style={styles.alertItem}>{unassigned.join(", ")}</div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div style={styles.empty}>생성된 스케줄이 없습니다.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <div style={styles.summary}>총 {assignments.length}건 생성됨</div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>날짜</th>
                <th style={styles.th}>직원명</th>
                <th style={styles.th}>근무유형</th>
              </tr>
            </thead>
            <tbody>
              {sortedDates.map((date) =>
                groupedByDate[date].map((item, idx) => (
                  <tr key={`${date}-${idx}`} style={styles.tr}>
                    {idx === 0 && (
                      <td rowSpan={groupedByDate[date].length} style={{ ...styles.td, fontWeight: "600" }}>
                        {date}
                        <div style={styles.dateSub}>{groupedByDate[date].length}명</div>
                      </td>
                    )}
                    <td style={styles.td}>{item.staffName || "-"}</td>
                    <td style={styles.td}>{shiftLabel(item.shiftType)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.buttonBox}>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            ...styles.btn,
            backgroundColor: hasBlockingErrors || assignments.length === 0 ? "#ccc" : "#4a90d9",
            color: "#fff",
            cursor: hasBlockingErrors || assignments.length === 0 ? "not-allowed" : "pointer",
          }}
          disabled={isLoading || assignments.length === 0 || hasBlockingErrors}
        >
          {isLoading ? "저장 중..." : "확정"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...styles.btn, backgroundColor: "#f0f0f0", color: "#333", cursor: "pointer" }}
          disabled={isLoading}
        >
          취소
        </button>
      </div>
    </div>
  );
};

export default AutoScheduleResultView;

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "500px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
  },
  desc: {
    margin: 0,
    fontSize: "13px",
    color: "#555",
  },
  alert: {
    padding: "10px 12px",
    border: "1px solid",
    borderRadius: "4px",
    fontSize: "13px",
  },
  alertItem: {
    marginTop: "4px",
  },
  summary: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "6px",
  },
  tableWrapper: {
    maxHeight: "55vh",
    overflowY: "auto",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  thead: {
    backgroundColor: "#f5f5f5",
  },
  th: {
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: "600",
    borderBottom: "1px solid #ddd",
    position: "sticky",
    top: 0,
    backgroundColor: "#f5f5f5",
  },
  tr: {
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "7px 12px",
    verticalAlign: "middle",
  },
  dateSub: {
    fontSize: "11px",
    color: "#888",
    fontWeight: "400",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#aaa",
    border: "1px solid #eee",
    borderRadius: "4px",
    fontSize: "13px",
  },
  buttonBox: {
    display: "flex",
    gap: "8px",
    paddingTop: "4px",
  },
  btn: {
    padding: "8px 20px",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
  },
};
