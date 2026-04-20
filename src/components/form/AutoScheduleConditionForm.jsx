import React, { useState } from "react";

const initialForm = {
  departmentId: "",
  startDate: "",
  endDate: "",
  minStaffDay: 2,
  minStaffEvening: 1,
  minStaffNight: 1,
  maxConsecutiveNight: 3,
  blockNightToDay: true,
  blockNightToEvening: false,
  maxWorkDaysPerWeek: 5,
  extraCondition: "",
};

const AutoScheduleConditionForm = ({
  onSubmit,
  onClose,
  departmentList = [],
  isLoading = false,
}) => {
  const [formData, setFormData] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.departmentId) {
      alert("부서를 선택해주세요");
      return;
    }
    if (!formData.startDate) {
      alert("시작일을 선택해주세요");
      return;
    }
    if (!formData.endDate) {
      alert("종료일을 선택해주세요");
      return;
    }
    if (formData.startDate > formData.endDate) {
      alert("시작일은 종료일보다 늦을 수 없습니다");
      return;
    }

    onSubmit({
      departmentId: Number(formData.departmentId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      minStaffMap: {
        DAY: Number(formData.minStaffDay),
        EVENING: Number(formData.minStaffEvening),
        NIGHT: Number(formData.minStaffNight),
      },
      maxConsecutiveNight: Number(formData.maxConsecutiveNight),
      blockNightToDay: formData.blockNightToDay,
      blockNightToEvening: formData.blockNightToEvening,
      maxWorkDaysPerWeek: Number(formData.maxWorkDaysPerWeek),
      extraCondition: formData.extraCondition.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>자동 스케줄 조건 등록</h3>
      <p style={styles.desc}>조건을 입력하면 AI가 자동으로 스케줄을 생성합니다.</p>

      {/* 기간 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>기본 설정</div>

        <div style={styles.field}>
          <label style={styles.label}>부서 <span style={styles.required}>*</span></label>
          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            style={styles.input}
            disabled={isLoading}
          >
            <option value="">부서 선택</option>
            {departmentList.map((dept) => (
              <option key={dept.departmentId} value={dept.departmentId}>
                {dept.departmentName}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>시작일 <span style={styles.required}>*</span></label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
          <span style={styles.rowSep}>~</span>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>종료일 <span style={styles.required}>*</span></label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* 최소 인원 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>하루 최소 근무 인원</div>
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>데이(DAY)</label>
            <input
              type="number"
              name="minStaffDay"
              min={0}
              value={formData.minStaffDay}
              onChange={handleChange}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>이브닝(EVENING)</label>
            <input
              type="number"
              name="minStaffEvening"
              min={0}
              value={formData.minStaffEvening}
              onChange={handleChange}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>나이트(NIGHT)</label>
            <input
              type="number"
              name="minStaffNight"
              min={0}
              value={formData.minStaffNight}
              onChange={handleChange}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* 야간 근무 규칙 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>야간 근무 규칙</div>

        <div style={styles.field}>
          <label style={styles.label}>야간 연속 최대 일수</label>
          <div style={styles.row}>
            <input
              type="number"
              name="maxConsecutiveNight"
              min={1}
              max={7}
              value={formData.maxConsecutiveNight}
              onChange={handleChange}
              style={{ ...styles.input, width: "80px" }}
              disabled={isLoading}
            />
            <span style={styles.unit}>일</span>
          </div>
        </div>

        <div style={styles.checkboxGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="blockNightToDay"
              checked={formData.blockNightToDay}
              onChange={handleChange}
              disabled={isLoading}
            />
            야간 근무 다음날 데이(DAY) 근무 금지
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="blockNightToEvening"
              checked={formData.blockNightToEvening}
              onChange={handleChange}
              disabled={isLoading}
            />
            야간 근무 다음날 이브닝(EVENING) 근무 금지
          </label>
        </div>
      </div>

      {/* 주간 근무일 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>주간 근무 제한</div>
        <div style={styles.field}>
          <label style={styles.label}>주 최대 근무일</label>
          <div style={styles.row}>
            <input
              type="number"
              name="maxWorkDaysPerWeek"
              min={1}
              max={7}
              value={formData.maxWorkDaysPerWeek}
              onChange={handleChange}
              style={{ ...styles.input, width: "80px" }}
              disabled={isLoading}
            />
            <span style={styles.unit}>일</span>
          </div>
        </div>
      </div>

      {/* 개별 추가 조건 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>개별 추가 조건 (선택)</div>
        <div style={styles.field}>
          <textarea
            name="extraCondition"
            value={formData.extraCondition}
            onChange={handleChange}
            placeholder={"예) 김행정 6/3 OFF\n예) 홍길동 야간 제외\n한 줄에 하나씩 입력하세요"}
            style={styles.textarea}
            rows={3}
            disabled={isLoading}
          />
          <p style={styles.hint}>일반 규칙 외 특수 조건만 입력하세요.</p>
        </div>
      </div>

      <div style={styles.buttonBox}>
        <button type="submit" style={styles.submitBtn} disabled={isLoading}>
          {isLoading ? "생성 중..." : "AI 스케줄 생성"}
        </button>
        <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isLoading}>
          취소
        </button>
      </div>

      {isLoading && (
        <p style={styles.loadingText}>AI가 스케줄을 생성 중입니다. 잠시 기다려주세요...</p>
      )}
    </form>
  );
};

export default AutoScheduleConditionForm;

const styles = {
  form: {
    width: "480px",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  title: {
    marginTop: 0,
    marginBottom: "4px",
    fontSize: "18px",
  },
  desc: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "13px",
    color: "#6b7280",
  },
  section: {
    marginBottom: "20px",
    padding: "14px 16px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e5e7eb",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginBottom: "10px",
  },
  row: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
  },
  rowSep: {
    paddingBottom: "8px",
    color: "#6b7280",
    fontWeight: "bold",
    flexShrink: 0,
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
  },
  required: {
    color: "#ef4444",
  },
  input: {
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#fff",
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    backgroundColor: "#fff",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
  },
  unit: {
    fontSize: "14px",
    color: "#6b7280",
    paddingBottom: "8px",
    flexShrink: 0,
  },
  hint: {
    margin: 0,
    fontSize: "12px",
    color: "#9ca3af",
  },
  buttonBox: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  submitBtn: {
    padding: "9px 20px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  cancelBtn: {
    padding: "9px 20px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  loadingText: {
    marginTop: "12px",
    fontSize: "13px",
    color: "#3b82f6",
    textAlign: "center",
  },
};
