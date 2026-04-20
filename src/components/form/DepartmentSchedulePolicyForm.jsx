import React, { useEffect, useState } from "react";
import { getDepartmentList } from "../../api/hr/departmentApi";

const SHIFT_OPTIONS = ["DAY", "EVENING", "NIGHT", "OFF"];
const SHIFT_LABEL = { DAY: "데이", EVENING: "이브닝", NIGHT: "나이트", OFF: "휴무" };

const initState = {
  departmentId: "",
  departmentName: "",
  jobType: "",
  shiftTypes: [],
  minStaffMap: {},
  maxConsecutiveNight: "",
  blockNightToDay: false,
  blockNightToEvening: false,
  maxWorkDaysPerWeek: "",
  isActive: true,
};

const DepartmentSchedulePolicyForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initState);
  const [departmentList, setDepartmentList] = useState([]);

  useEffect(() => {
    getDepartmentList()
      .then((data) => setDepartmentList(Array.isArray(data) ? data : []))
      .catch(() => setDepartmentList([]));
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        departmentId: initialData.departmentId ?? "",
        departmentName: initialData.departmentName ?? "",
        jobType: initialData.jobType ?? "",
        shiftTypes: initialData.shiftTypes ?? [],
        minStaffMap: initialData.minStaffMap ?? {},
        maxConsecutiveNight: initialData.maxConsecutiveNight ?? "",
        blockNightToDay: initialData.blockNightToDay ?? false,
        blockNightToEvening: initialData.blockNightToEvening ?? false,
        maxWorkDaysPerWeek: initialData.maxWorkDaysPerWeek ?? "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setForm(initState);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name !== "shiftTypes") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "isActive") {
      setForm((prev) => ({ ...prev, isActive: value === "true" }));
      return;
    }

    if (name === "departmentId") {
      const found = departmentList.find((d) => String(d.departmentId) === value);
      setForm((prev) => ({
        ...prev,
        departmentId: value,
        departmentName: found ? found.departmentName : "",
        jobType: found ? (found.departmentCategory || "") : "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleShiftToggle = (shift) => {
    setForm((prev) => {
      const current = prev.shiftTypes || [];
      if (current.includes(shift)) {
        const newMap = { ...prev.minStaffMap };
        delete newMap[shift];
        return { ...prev, shiftTypes: current.filter((s) => s !== shift), minStaffMap: newMap };
      } else {
        return {
          ...prev,
          shiftTypes: [...current, shift],
          minStaffMap: { ...prev.minStaffMap, [shift]: 1 },
        };
      }
    });
  };

  const handleMinStaffChange = (shift, value) => {
    setForm((prev) => ({
      ...prev,
      minStaffMap: { ...prev.minStaffMap, [shift]: Number(value) },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.departmentId) {
      alert("부서를 선택하세요");
      return;
    }
    if (!form.jobType.trim()) {
      alert("직무유형을 입력하세요");
      return;
    }
    if (form.shiftTypes.length === 0) {
      alert("허용 근무유형을 하나 이상 선택하세요");
      return;
    }

    const requestData = {
      departmentId: Number(form.departmentId),
      departmentName: form.departmentName,
      jobType: form.jobType.trim(),
      shiftTypes: form.shiftTypes,
      minStaffMap: form.minStaffMap,
      maxConsecutiveNight: form.maxConsecutiveNight !== "" ? Number(form.maxConsecutiveNight) : null,
      blockNightToDay: form.blockNightToDay,
      blockNightToEvening: form.blockNightToEvening,
      maxWorkDaysPerWeek: form.maxWorkDaysPerWeek !== "" ? Number(form.maxWorkDaysPerWeek) : null,
      isActive: form.isActive,
    };

    onSubmit(requestData);
  };

  const isEdit = !!initialData;

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>{isEdit ? "부서 스케줄 정책 수정" : "부서 스케줄 정책 등록"}</h3>

      <div style={styles.formGrid}>
        {/* 부서 선택 */}
        <div style={styles.field}>
          <label style={styles.label}>부서</label>
          <select
            name="departmentId"
            value={form.departmentId}
            onChange={handleChange}
            disabled={isEdit}
            style={styles.input}
          >
            <option value="">부서 선택</option>
            {departmentList.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.departmentName}
              </option>
            ))}
          </select>
        </div>

        {/* 직무유형 - 부서의 departmentCategory에서 자동 조회 */}
        <div style={styles.field}>
          <label style={styles.label}>직무유형</label>
          <input
            type="text"
            name="jobType"
            value={form.jobType}
            readOnly
            style={{ ...styles.input, backgroundColor: "#f5f5f5", color: "#888" }}
          />
        </div>

        {/* 주 최대 근무일 */}
        <div style={styles.field}>
          <label style={styles.label}>주 최대 근무일</label>
          <input
            type="number"
            name="maxWorkDaysPerWeek"
            min={1}
            max={7}
            placeholder="예: 5"
            value={form.maxWorkDaysPerWeek}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        {/* 최대 연속 야간근무 */}
        <div style={styles.field}>
          <label style={styles.label}>최대 연속 야간근무일</label>
          <input
            type="number"
            name="maxConsecutiveNight"
            min={0}
            placeholder="예: 3"
            value={form.maxConsecutiveNight}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        {/* 활성여부 */}
        <div style={styles.field}>
          <label style={styles.label}>상태</label>
          <select
            name="isActive"
            value={String(form.isActive)}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </div>
      </div>

      {/* 허용 근무유형 + 최소인원 */}
      <div style={styles.section}>
        <label style={styles.label}>허용 근무유형 및 최소인원</label>
        <div style={styles.shiftGrid}>
          {SHIFT_OPTIONS.map((shift) => {
            const checked = form.shiftTypes.includes(shift);
            return (
              <div key={shift} style={styles.shiftRow}>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleShiftToggle(shift)}
                  />
                  {SHIFT_LABEL[shift]}
                </label>
                {checked && (
                  <input
                    type="number"
                    min={0}
                    value={form.minStaffMap[shift] ?? 1}
                    onChange={(e) => handleMinStaffChange(shift, e.target.value)}
                    style={styles.minInput}
                    placeholder="최소인원"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 야간 제한 */}
      <div style={styles.section}>
        <label style={styles.label}>야간근무 후 제한</label>
        <div style={styles.checkRow}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              name="blockNightToDay"
              checked={form.blockNightToDay}
              onChange={handleChange}
            />
            야간 → 데이 금지
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              name="blockNightToEvening"
              checked={form.blockNightToEvening}
              onChange={handleChange}
            />
            야간 → 이브닝 금지
          </label>
        </div>
      </div>

      <div style={styles.buttonBox}>
        <button type="submit">{isEdit ? "수정" : "등록"}</button>
        <button type="button" onClick={onClose}>취소</button>
      </div>
    </form>
  );
};

export default DepartmentSchedulePolicyForm;

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "460px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    padding: "6px 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  shiftGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  shiftRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    border: "1px solid #eee",
    borderRadius: "4px",
    backgroundColor: "#fafafa",
  },
  checkRow: {
    display: "flex",
    gap: "20px",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  minInput: {
    width: "70px",
    padding: "4px 6px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "13px",
  },
  buttonBox: {
    display: "flex",
    gap: "8px",
    paddingTop: "4px",
  },
};
