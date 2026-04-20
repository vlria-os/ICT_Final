import React, { useEffect, useMemo, useState } from "react";
import CommonModal from "../../components/common/CommonModal";
import {
  getSurgeryList,
  registerSurgery,
  registerEmergencySurgery,
  updateSurgery,
  cancelSurgery,
} from "../../api/surgeryApi";
import { getStaffList } from "../../api/hr/staffApi";
import { getDoctorDepartmentList } from "../../api/hr/departmentApi";
import { getScheduleList } from "../../api/hr/staffScheduleApi";


const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getWeekDates = (baseDate) => {
  const d = new Date(baseDate);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(sunday);
    cur.setDate(sunday.getDate() + i);
    return {
      date: formatDate(cur),
      label: `${String(cur.getMonth() + 1).padStart(2, "0")}/${String(cur.getDate()).padStart(2, "0")}`,
      dayName: ["일", "월", "화", "수", "목", "금", "토"][cur.getDay()],
      isToday: formatDate(cur) === getTodayString(),
    };
  });
};

const STATUS_LABEL = {
  SCHEDULED: "예정",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
  EMERGENCY: "응급",
};

const STATUS_COLOR = {
  SCHEDULED: { bg: "#fff", text: "#222" },
  IN_PROGRESS: { bg: "#fff", text: "#222" },
  COMPLETED: { bg: "#fff", text: "#222" },
  CANCELLED: { bg: "#fff", text: "#222" },
  EMERGENCY: { bg: "#fff", text: "#222" },
};


const emptyForm = {
  surgeryId: null,
  doctorId: "",
  patientId: "",
  startTime: "",
  durationHours: 1,
  description: "",
  status: "SCHEDULED",
};


const SurgeryForm = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEdit,
  isEmergency,
  staffList,
  departmentList,
  scheduleList,
}) => {
  const [filterDeptId, setFilterDeptId] = useState("");

  const filteredDoctors = useMemo(() => {
    if (!filterDeptId) return staffList;
    return staffList.filter(
      (s) => String(s.departmentId) === String(filterDeptId)
    );
  }, [staffList, filterDeptId]);

  // 선택된 의사+날짜의 직원 스케줄 확인
  const scheduleWarning = useMemo(() => {
    if (!formData.doctorId || !formData.startTime) return null;
    const dateStr = formData.startTime.slice(0, 10);
    const schedule = scheduleList.find(
      (s) =>
        String(s.staffId) === String(formData.doctorId) &&
        s.workDate === dateStr
    );
    if (!schedule) return { level: "error", msg: "해당 날짜에 직원 스케줄이 등록되지 않아 수술 등록이 불가합니다." };
    if (schedule.scheduleTypeId === 3) return { level: "error", msg: `휴일(${schedule.typeName || "OFF"}) 스케줄입니다. 수술 등록이 불가합니다.` };
    if (schedule.status === "TEMP") return { level: "warn", msg: `스케줄이 미확정(임시) 상태입니다. 확정 후 등록을 권장합니다.` };
    return { level: "ok", msg: `근무 스케줄 확인됨 (${schedule.typeName || schedule.typeCode || "근무"})` };
  }, [formData.doctorId, formData.startTime, scheduleList]);

  const isScheduleBlocked = !isEmergency && scheduleWarning?.level === "error";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.patientId || !formData.startTime || !formData.durationHours) {
      alert("의사, 환자, 수술 시작 시간, 예상 시간은 필수입니다");
      return;
    }
    if (isScheduleBlocked) {
      alert(scheduleWarning.msg);
      return;
    }
    onSubmit(formData);
  };

  const title = isEmergency
    ? "응급 수술 등록"
    : isEdit
    ? "수술 수정"
    : "수술 등록";

  return (
    <form onSubmit={handleSubmit} style={formStyles.wrap}>
      <h3 style={formStyles.title}>
        {isEmergency && <span style={formStyles.emergencyBadge}>응급</span>}
        {title}
      </h3>

      {/* 부서 필터 */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>부서 선택 (의사 필터)</label>
        <select
          value={filterDeptId}
          onChange={(e) => setFilterDeptId(e.target.value)}
          style={formStyles.input}
        >
          <option value="">전체 부서</option>
          {departmentList.map((d) => (
            <option key={d.departmentId} value={d.departmentId}>
              {d.departmentName}
            </option>
          ))}
        </select>
      </div>

      {/* 의사 */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>담당 의사 *</label>
        <select
          name="doctorId"
          value={formData.doctorId}
          onChange={handleChange}
          style={formStyles.input}
          required
        >
          <option value="">의사 선택</option>
          {filteredDoctors.map((s) => (
            <option key={s.staffId} value={s.staffId}>
              {s.name} ({s.staffId})
            </option>
          ))}
        </select>
      </div>

      {/* 환자 ID */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>환자 ID *</label>
        <input
          type="number"
          name="patientId"
          value={formData.patientId}
          onChange={handleChange}
          style={formStyles.input}
          placeholder="환자 ID를 입력하세요"
          required
          min={1}
        />
      </div>

      {/* 수술 시작 시간 */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>수술 시작 시간 *</label>
        <input
          type="datetime-local"
          name="startTime"
          value={formData.startTime}
          onChange={handleChange}
          style={formStyles.input}
          required
        />
      </div>

      {/* 직원 스케줄 상태 */}
      {scheduleWarning && (
        <div style={{
          ...formStyles.field,
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "13px",
          background: scheduleWarning.level === "error" ? "#fee2e2"
            : scheduleWarning.level === "warn" ? "#fef9c3"
            : "#dcfce7",
          color: scheduleWarning.level === "error" ? "#b91c1c"
            : scheduleWarning.level === "warn" ? "#92400e"
            : "#15803d",
          border: `1px solid ${scheduleWarning.level === "error" ? "#fca5a5"
            : scheduleWarning.level === "warn" ? "#fde68a"
            : "#86efac"}`,
        }}>
          {scheduleWarning.level === "error" ? "⛔ " : scheduleWarning.level === "warn" ? "⚠️ " : "✅ "}
          {scheduleWarning.msg}
          {isEmergency && scheduleWarning.level === "error" && (
            <span style={{ marginLeft: "6px", fontWeight: "bold" }}>(응급 수술이므로 강제 등록 가능)</span>
          )}
        </div>
      )}

      {/* 수술 예상 시간 */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>수술 예상 시간 (시간) *</label>
        <input
          type="number"
          name="durationHours"
          value={formData.durationHours}
          onChange={handleChange}
          style={formStyles.input}
          min={1}
          max={24}
          required
        />
      </div>

      {/* 수술 설명 */}
      <div style={formStyles.field}>
        <label style={formStyles.label}>수술 내용</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          style={{ ...formStyles.input, height: "80px", resize: "vertical" }}
          placeholder="수술 내용을 입력하세요"
        />
      </div>

      {/* 상태 (수정 시에만) */}
      {isEdit && (
        <div style={formStyles.field}>
          <label style={formStyles.label}>상태</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            style={formStyles.input}
          >
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={formStyles.btnRow}>
        <button type="button" onClick={onClose} style={formStyles.cancelBtn}>
          취소
        </button>
        <button
          type="submit"
          disabled={isScheduleBlocked}
          style={{
            ...(isEmergency ? formStyles.emergencyBtn : formStyles.submitBtn),
            ...(isScheduleBlocked ? { opacity: 0.45, cursor: "not-allowed" } : {}),
          }}
        >
          {isEmergency ? "응급 등록" : isEdit ? "수정" : "등록"}
        </button>
      </div>
    </form>
  );
};

const formStyles = {
  wrap: { minWidth: "420px", display: "flex", flexDirection: "column", gap: "12px" },
  title: { margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" },
  emergencyBadge: { background: "#fee2e2", color: "#b91c1c", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  input: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", width: "100%", boxSizing: "border-box" },
  btnRow: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" },
  cancelBtn: { padding: "8px 20px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "14px" },
  submitBtn: { padding: "8px 20px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" },
  emergencyBtn: { padding: "8px 20px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" },
};


const SurgerySchedulePage = () => {
  const [surgeryList, setSurgeryList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);


  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [doctorSearchKeyword, setDoctorSearchKeyword] = useState("");

  const [currentWeek, setCurrentWeek] = useState(getTodayString());

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  // 등록/수정 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [surgeries, staffs, depts, schedules] = await Promise.all([
        getSurgeryList(),
        getStaffList(),
        getDoctorDepartmentList(),
        getScheduleList(),
      ]);
      setSurgeryList(surgeries);
      setStaffList(staffs);
      setDepartmentList(depts);
      setScheduleList(Array.isArray(schedules) ? schedules : schedules?.content ?? []);
    } catch (err) {
      console.error("초기 데이터 로드 실패", err);
      alert("데이터를 불러오는 중 오류가 발생했습니다");
    }
  };

  const fetchSurgeries = async () => {
    try {
      const data = await getSurgeryList();
      setSurgeryList(data);
    } catch (err) {
      console.error("수술 목록 조회 실패", err);
    }
  };

  //  주간 날짜 
  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);

  const moveWeek = (diff) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + diff * 7);
    setCurrentWeek(formatDate(d));
  };

  // 부서 기준 의사 목록 
  const sortedDepartments = useMemo(
    () => [...departmentList].sort((a, b) => (a.departmentName || "").localeCompare(b.departmentName || "", "ko")),
    [departmentList]
  );

  const doctorsByDept = useMemo(() => {
    if (!selectedDeptId) return staffList;
    return staffList.filter((s) => String(s.departmentId) === String(selectedDeptId));
  }, [staffList, selectedDeptId]);

  const filteredDoctors = useMemo(() => {
    let result = doctorsByDept;
    if (selectedDoctorId) {
      result = result.filter((s) => String(s.staffId) === String(selectedDoctorId));
    }
    if (doctorSearchKeyword.trim()) {
      result = result.filter((s) =>
        (s.name || "").includes(doctorSearchKeyword.trim())
      );
    }
    return result;
  }, [doctorsByDept, selectedDoctorId, doctorSearchKeyword]);

  // 수술 맵: doctorId → date → surgeries[] 
  const surgeryMap = useMemo(() => {
    const map = {};
    const weekDateSet = new Set(weekDates.map((d) => d.date));

    surgeryList.forEach((s) => {
      if (!s.startTime) return;
      const dateStr = s.startTime.slice(0, 10);
      if (!weekDateSet.has(dateStr)) return;

      // 상태 필터
      if (selectedStatus && s.status !== selectedStatus) return;

      const doctorId = s.doctorId;
      if (!doctorId) return;

      if (!map[doctorId]) map[doctorId] = {};
      if (!map[doctorId][dateStr]) map[doctorId][dateStr] = [];
      map[doctorId][dateStr].push(s);
    });

    return map;
  }, [surgeryList, weekDates, selectedStatus]);

  const openDetail = (surgery) => {
    setSelectedSurgery(surgery);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedSurgery(null);
  };

  const openRegister = () => {
    setIsEdit(false);
    setIsEmergency(false);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEmergency = () => {
    setIsEdit(false);
    setIsEmergency(true);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (surgery) => {
    setIsEdit(true);
    setIsEmergency(false);
    closeDetail();
    // startTime ~ endTime으로 durationHours 역산
    let durationHours = 1;
    if (surgery.startTime && surgery.endTime) {
      const diff = new Date(surgery.endTime) - new Date(surgery.startTime);
      durationHours = Math.round(diff / (1000 * 60 * 60)) || 1;
    }
    setFormData({
      surgeryId: surgery.surgeryId,
      doctorId: surgery.doctorId || "",
      patientId: surgery.patientId || "",
      startTime: surgery.startTime ? surgery.startTime.slice(0, 16) : "",
      durationHours,
      description: surgery.description || "",
      status: surgery.status || "SCHEDULED",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(emptyForm);
  };

  const handleSubmit = async (data) => {
    try {
      const startIso = data.startTime.length === 16 ? data.startTime + ":00" : data.startTime;

      const payload = {
        doctorId: Number(data.doctorId),
        patientId: Number(data.patientId),
        startTime: startIso,
        durationHours: Number(data.durationHours),
        description: data.description,
      };

      if (isEdit) {
        await updateSurgery({
          ...payload,
          surgeryId: data.surgeryId,
          status: data.status,
        });
        alert("수술이 수정되었습니다");
      } else if (isEmergency) {
        await registerEmergencySurgery(payload);
        alert("응급 수술이 등록되었습니다");
      } else {
        await registerSurgery(payload);
        alert("수술이 등록되었습니다");
      }

      closeModal();
      fetchSurgeries();
    } catch (err) {
      console.error("수술 저장 실패", err);
      const msg = err?.response?.data?.message || "저장 중 오류가 발생했습니다";
      alert(msg);
    }
  };

  const handleCancel = async (surgeryId) => {
    if (!window.confirm("해당 수술을 취소하시겠습니까?")) return;
    try {
      await cancelSurgery(surgeryId);
      alert("수술이 취소되었습니다");
      closeDetail();
      fetchSurgeries();
    } catch (err) {
      console.error("수술 취소 실패", err);
      alert("취소 중 오류가 발생했습니다");
    }
  };

  const handleResetFilter = () => {
    setSelectedDeptId("");
    setSelectedDoctorId("");
    setSelectedStatus("");
    setDoctorSearchKeyword("");
    setCurrentWeek(getTodayString());
  };


  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h2 style={styles.title}>수술 스케줄 관리</h2>
        <div style={styles.headerBtns}>
          <button style={styles.registerBtn} onClick={openRegister}>
            수술 등록
          </button>
          <button style={styles.emergencyBtn} onClick={openEmergency}>
            응급 수술 등록
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div style={styles.filterBar}>
        {/* 부서 */}
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>부서</label>
          <select
            value={selectedDeptId}
            onChange={(e) => {
              setSelectedDeptId(e.target.value);
              setSelectedDoctorId("");
            }}
            style={styles.select}
          >
            <option value="">전체 부서</option>
            {sortedDepartments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.departmentName}
              </option>
            ))}
          </select>
        </div>

        {/* 의사 */}
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>의사</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            style={styles.select}
          >
            <option value="">전체 의사</option>
            {doctorsByDept.map((s) => (
              <option key={s.staffId} value={s.staffId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 의사 이름 검색 */}
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>의사 검색</label>
          <input
            type="text"
            value={doctorSearchKeyword}
            onChange={(e) => setDoctorSearchKeyword(e.target.value)}
            placeholder="의사 이름 입력"
            style={styles.searchInput}
          />
        </div>

        {/* 상태 */}
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>상태</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={styles.select}
          >
            <option value="">전체 상태</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button style={styles.resetBtn} onClick={handleResetFilter}>
          초기화
        </button>
      </div>

      {/* 주간 캘린더 */}
      <div style={styles.calendarWrapper}>
        {/* 주간 이동 */}
        <div style={styles.weekNav}>
          <button style={styles.navBtn} onClick={() => moveWeek(-1)}>
            ◀ 이전 주
          </button>
          <span style={styles.weekRange}>
            {weekDates[0]?.date} ~ {weekDates[6]?.date}
          </span>
          <button style={styles.navBtn} onClick={() => moveWeek(1)}>
            다음 주 ▶
          </button>
          <button
            style={{ ...styles.navBtn, marginLeft: "8px" }}
            onClick={() => setCurrentWeek(getTodayString())}
          >
            오늘
          </button>
        </div>

        {/* 테이블 */}
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.doctorHeader}>의사</th>
                {weekDates.map((day) => (
                  <th
                    key={day.date}
                    style={{
                      ...styles.dateHeader,
                      ...(day.isToday ? styles.todayHeader : {}),
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>{day.dayName}</div>
                    <div style={styles.dateLabel}>{day.label}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.emptyCell}>
                    표시할 의사 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => (
                  <tr key={doctor.staffId}>
                    {/* 의사 셀 */}
                    <td style={styles.doctorCell}>
                      <div style={styles.doctorName}>{doctor.name}</div>
                      <div style={styles.doctorId}>#{doctor.staffId}</div>
                    </td>

                    {/* 날짜별 수술 */}
                    {weekDates.map((day) => {
                      const surgeries =
                        surgeryMap[doctor.staffId]?.[day.date] || [];

                      // 해당 의사의 해당 날짜 직원 스케줄 확인
                      const docSchedule = scheduleList.find(
                        (s) =>
                          String(s.staffId) === String(doctor.staffId) &&
                          s.workDate === day.date
                      );
                      const isOff = docSchedule?.scheduleTypeId === 3;
                      const hasNoSchedule = !docSchedule;

                      return (
                        <td
                          key={day.date}
                          style={{
                            ...styles.surgeryCell,
                            ...(day.isToday ? styles.todayCell : {}),
                            background: isOff ? "#fef2f2" : hasNoSchedule ? "#f9fafb" : undefined,
                          }}
                        >
                          {/* 스케줄 상태 뱃지 */}
                          {isOff && (
                            <div style={styles.scheduleBadge.off}>휴일</div>
                          )}
                          {!isOff && !hasNoSchedule && docSchedule.status === "TEMP" && (
                            <div style={styles.scheduleBadge.temp}>미확정</div>
                          )}
                          {!isOff && !hasNoSchedule && docSchedule.status !== "TEMP" && (
                            <div style={styles.scheduleBadge.on}>
                              {docSchedule.typeName || docSchedule.typeCode || "근무"}
                            </div>
                          )}
                          {hasNoSchedule && (
                            <div style={styles.scheduleBadge.none}>스케줄없음</div>
                          )}
                          {surgeries.map((s) => {
                            const statusStyle =
                              STATUS_COLOR[s.status] || STATUS_COLOR.SCHEDULED;
                            const startStr = s.startTime?.slice(11, 16) || "";
                            const endStr = s.endTime?.slice(11, 16) || "";
                            const timeStr = endStr ? `${startStr} ~ ${endStr}` : startStr;

                            return (
                              <div
                                key={s.surgeryId}
                                style={{
                                  ...styles.surgeryCard,
                                  background: statusStyle.bg,
                                  borderLeft: `3px solid ${statusStyle.text}`,
                                  cursor: "pointer",
                                }}
                                onClick={() => openDetail(s)}
                              >
                                <div style={{ ...styles.surgeryStatus, color: statusStyle.text }}>
                                  {STATUS_LABEL[s.status] || s.status}
                                </div>
                                <div style={styles.surgeryTime}>{timeStr}</div>
                                <div style={styles.surgeryDesc}>
                                  {s.description || "-"}
                                </div>
                                <div style={styles.surgeryPatient}>
                                  환자: {s.patientName || s.patientId || "-"}
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 상세 모달 */}
      <CommonModal open={detailOpen} onClose={closeDetail}>
        {selectedSurgery && (
          <div style={detailStyles.wrap}>
            <h3 style={detailStyles.title}>수술 상세 정보</h3>

            <div style={detailStyles.grid}>
              <span style={detailStyles.key}>상태</span>
              <span style={detailStyles.value}>
                {STATUS_LABEL[selectedSurgery.status] || selectedSurgery.status}
              </span>

              <span style={detailStyles.key}>담당 의사</span>
              <span style={detailStyles.value}>
                {selectedSurgery.doctorName} (#{selectedSurgery.doctorId})
              </span>

              <span style={detailStyles.key}>환자</span>
              <span style={detailStyles.value}>
                {selectedSurgery.patientName} (#{selectedSurgery.patientId})
              </span>

              <span style={detailStyles.key}>시작 시간</span>
              <span style={detailStyles.value}>
                {selectedSurgery.startTime?.replace("T", " ").slice(0, 16)}
              </span>

              <span style={detailStyles.key}>종료 시간</span>
              <span style={detailStyles.value}>
                {selectedSurgery.endTime?.replace("T", " ").slice(0, 16)}
              </span>

              <span style={detailStyles.key}>수술 내용</span>
              <span style={detailStyles.value}>
                {selectedSurgery.description || "-"}
              </span>

              <span style={detailStyles.key}>등록 일시</span>
              <span style={detailStyles.value}>
                {selectedSurgery.createdAt?.replace("T", " ").slice(0, 16)}
              </span>
            </div>

            <div style={detailStyles.btnRow}>
              <button style={detailStyles.closeBtn} onClick={closeDetail}>
                닫기
              </button>
              {selectedSurgery.status !== "CANCELLED" && (
                <>
                  <button
                    style={detailStyles.editBtn}
                    onClick={() => openEdit(selectedSurgery)}
                  >
                    수정하기
                  </button>
                  <button
                    style={detailStyles.cancelBtn}
                    onClick={() => handleCancel(selectedSurgery.surgeryId)}
                  >
                    수술 취소
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </CommonModal>

      {/* 등록/수정 모달 */}
      <CommonModal open={modalOpen} onClose={closeModal}>
        <SurgeryForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isEdit={isEdit}
          isEmergency={isEmergency}
          staffList={staffList}
          departmentList={departmentList}
          scheduleList={scheduleList}
        />
      </CommonModal>
    </div>
  );
};

export default SurgerySchedulePage;


const styles = {
  container: { padding: "24px" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { margin: 0, fontSize: "22px", fontWeight: "bold" },
  headerBtns: { display: "flex", gap: "10px" },

  registerBtn: {
    padding: "9px 18px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
  },
  emergencyBtn: {
    padding: "9px 18px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
  },

  // 필터
  filterBar: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
    marginBottom: "18px",
    padding: "14px 18px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },
  filterItem: { display: "flex", flexDirection: "column", gap: "4px" },
  filterLabel: { fontSize: "12px", fontWeight: "600", color: "#6b7280" },
  select: {
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    minWidth: "140px",
    background: "#fff",
  },
  searchInput: {
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    minWidth: "140px",
    background: "#fff",
  },
  resetBtn: {
    alignSelf: "flex-end",
    padding: "7px 16px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },

  // 캘린더 래퍼
  calendarWrapper: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
  },
  weekNav: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  navBtn: {
    padding: "6px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },
  weekRange: { fontWeight: "bold", fontSize: "15px", color: "#1f2937" },

  tableScroll: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
    tableLayout: "fixed",
  },

  doctorHeader: {
    width: "120px",
    padding: "10px",
    background: "#f1f5f9",
    border: "1px solid #e5e7eb",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: "bold",
    color: "#374151",
  },
  dateHeader: {
    padding: "10px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    textAlign: "center",
    fontSize: "13px",
    color: "#374151",
  },
  todayHeader: {},
  dateLabel: { fontSize: "11px", color: "#6b7280", marginTop: "2px" },

  doctorCell: {
    padding: "10px",
    border: "1px solid #e5e7eb",
    verticalAlign: "middle",
    background: "#fafafa",
    textAlign: "center",
  },
  doctorName: { fontWeight: "bold", fontSize: "13px", color: "#1f2937" },
  doctorId: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },

  surgeryCell: {
    padding: "6px",
    border: "1px solid #e5e7eb",
    verticalAlign: "top",
    minHeight: "80px",
    height: "auto",
  },
  todayCell: {},

  // 스케줄 상태 뱃지
  scheduleBadge: {
    off: {
      fontSize: "10px",
      fontWeight: "bold",
      color: "#b91c1c",
      background: "#fee2e2",
      borderRadius: "4px",
      padding: "1px 5px",
      marginBottom: "3px",
      display: "inline-block",
    },
    temp: {
      fontSize: "10px",
      fontWeight: "bold",
      color: "#92400e",
      background: "#fef3c7",
      borderRadius: "4px",
      padding: "1px 5px",
      marginBottom: "3px",
      display: "inline-block",
    },
    on: {
      fontSize: "10px",
      fontWeight: "bold",
      color: "#166534",
      background: "#dcfce7",
      borderRadius: "4px",
      padding: "1px 5px",
      marginBottom: "3px",
      display: "inline-block",
    },
    none: {
      fontSize: "10px",
      color: "#9ca3af",
      borderRadius: "4px",
      padding: "1px 5px",
      marginBottom: "3px",
      display: "inline-block",
    },
  },

  // 수술 카드
  surgeryCard: {
    borderRadius: "5px",
    padding: "6px 8px",
    marginBottom: "5px",
    fontSize: "12px",
    cursor: "default",
  },
  surgeryStatus: { fontWeight: "bold", fontSize: "11px", marginBottom: "2px" },
  surgeryTime: { color: "#374151", fontWeight: "600", marginBottom: "2px" },
  surgeryDesc: { color: "#4b5563", marginBottom: "2px", wordBreak: "break-all" },
  surgeryPatient: { color: "#6b7280", fontSize: "11px" },
  emptyCell: {
    padding: "40px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "14px",
  },

};

const detailStyles = {
  wrap: { minWidth: "400px", display: "flex", flexDirection: "column", gap: "16px" },
  title: { margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold" },
  grid: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: "10px 12px",
    fontSize: "14px",
  },
  key: { color: "#6b7280", fontWeight: "600", alignSelf: "center" },
  value: { color: "#1f2937", alignSelf: "center" },
  btnRow: { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" },
  closeBtn: {
    padding: "8px 18px",
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  editBtn: {
    padding: "8px 18px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  cancelBtn: {
    padding: "8px 18px",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
};
