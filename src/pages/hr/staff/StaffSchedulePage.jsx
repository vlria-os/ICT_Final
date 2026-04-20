import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import RegisterButton from "../../../components/common/RegisterButton";
import SearchBar from "../../../components/common/SearchBar";
import CommonTable from "../../../components/common/CommonTable";
import CommonModal from "../../../components/common/CommonModal";
import StaffScheduleForm from "../../../components/form/StaffScheduleForm";
import BulkScheduleForm from "../../../components/form/BulkScheduleForm";
import AutoScheduleConditionForm from "../../../components/form/AutoScheduleConditionForm";
import AutoScheduleResultView from "../../../components/schedule/AutoScheduleResultView";
import WeekScheduleTable from "../../../components/schedule/WeekScheduleTable";

import {
  bulkConfirmSchedule,
  bulkRegisterSchedule,
  confirmAutoSchedule,
  confirmSchedule,
  deleteSchedule,
  generateAutoSchedule,
  getScheduleList,
  registerSchedule,
  updateSchedule,
} from "../../../api/hr/staffScheduleApi";
import { getStaffList } from "../../../api/hr/staffApi";
import { getDepartmentList } from "../../../api/hr/departmentApi";
import { getSchedulePolicyList } from "../../../api/hr/schedulePolicyApi";

import "./StaffSchedulePage.css";

const initialForm = {
  scheduleId: "",
  departmentId: "",
  staffId: "",
  workDate: "",
  scheduleTypeId: "",
  status: "TEMP",
};

const initialBulkForm = {
  departmentId: "",
  staffIds: [],
  startDate: "",
  endDate: "",
  scheduleTypeId: "",
  status: "TEMP",
};

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

const StaffSchedulePage = () => {
  const [scheduleList, setScheduleList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [scheduleTypeList, setScheduleTypeList] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedScheduleTypeId, setSelectedScheduleTypeId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [viewMode, setViewMode] = useState("month");

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [isEdit, setIsEdit] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState(initialBulkForm);

  const [autoOpen, setAutoOpen] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResultOpen, setAutoResultOpen] = useState(false);
  const [autoResultSchedules, setAutoResultSchedules] = useState({
    assignments: [],
    unassigned: [],
    warnings: [],
    validationErrors: [],
  });
  const [autoConfirmLoading, setAutoConfirmLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const calendarRef = useRef(null);


  // 부서 정렬 목록
  const sortedDepartmentList = useMemo(() => {
    return [...departmentList].sort((a, b) =>
      (a.departmentName || "").localeCompare(b.departmentName || "", "ko")
    );
  }, [departmentList]);

  //근무유형 정렬 목록
  const sortedScheduleTypeList = useMemo(()=>{
    return[...scheduleTypeList].sort((a,b)=>
    (a.typeName || "").localeCompare(b.typeName || "", "ko")
    );
  },[scheduleTypeList]);

  // 달력형에서 우측 목록에 보여줄 스케줄
  const filteredScheduleList = useMemo(() => {
    let result = scheduleList;

    if (searchKeyword.trim()) {
      result = result.filter((item) =>
        (item.staffName || "").includes(searchKeyword.trim())
      );
    }

    if (selectedDepartmentId) {
      result = result.filter(
        (item) => String(item.departmentId) === String(selectedDepartmentId)
      );
    }
    
    if(selectedScheduleTypeId){
        result = result.filter(
            (item) => String(item.scheduleTypeId) === String(selectedScheduleTypeId) 
        )
    }

    if (selectedDate) {
      result = result.filter((item) => item.workDate === selectedDate);
    }

    return result;
  }, [scheduleList, searchKeyword, selectedDate, selectedDepartmentId, selectedScheduleTypeId]);

  // 달력형 우측 목록을 부서별로 묶기
  const groupedScheduleList = useMemo(() => {
    return filteredScheduleList.reduce((acc, item) => {
      const departmentName = item.departmentName || "미지정 부서";

      if (!acc[departmentName]) {
        acc[departmentName] = [];
      }

      acc[departmentName].push(item);
      return acc;
    }, {});
  }, [filteredScheduleList]);
  
  // 주간형 직원검색
    const filteredWeekStaffList= useMemo(()=>{
        let result = staffList;
        
        const keyword = searchKeyword.trim().toLowerCase();

        if(selectedDepartmentId){
            result = result.filter(
                (staff) => String(staff.departmentId) === String(selectedDepartmentId)
            );
        }
        if(keyword){
            result = result.filter((staff)=>
                (staff.name || "").toLowerCase().includes(keyword)
        );
        }
        return result;
    }, [staffList, selectedDepartmentId, searchKeyword]);

  // 주간형에서 보여줄 부서별 그룹
  const weekDepartmentGroups = useMemo(() => {
    const filteredStaffIds = new Set(
        filteredWeekStaffList.map((staff)=> String(staff.staffId))
    );

    let result = scheduleList;

    if (selectedDepartmentId) {
      result = result.filter(
        (item) => String(item.departmentId) === String(selectedDepartmentId)
      );
    }

    if (selectedScheduleTypeId){
        result = result.filter(
            (item) => String(item.scheduleTypeId) === String(selectedScheduleTypeId)
        );
    }
    result = result.filter((item)=>
        filteredStaffIds.has(String(item.staffId))
    );

    return result.reduce((acc, item) => {
      const departmentName = item.departmentName || "미지정 부서";

      if (!acc[departmentName]) {
        acc[departmentName] = [];
      }

      acc[departmentName].push(item);
      return acc;
    }, {});
  }, [scheduleList, selectedDepartmentId, filteredWeekStaffList, selectedScheduleTypeId]);



  // 달력에 날짜별 총 근무자 수 표시용 이벤트
  const events = useMemo(() => {
    return Object.values(
      scheduleList.reduce((acc, item) => {
        const date = item.workDate;

        if (!acc[date]) {
          acc[date] = { date, count: 0 };
        }

        acc[date].count += 1;
        return acc;
      }, {})
    ).map((item) => ({
      title: `총 ${item.count}명 근무`,
      date: item.date,
    }));
  }, [scheduleList]);

  // 테이블 컬럼
  const columns = [
    {
      key: "select",
      title: (
        <input
          type="checkbox"
          checked={
            filteredScheduleList.filter((item) => item.status === "TEMP")
              .length > 0 &&
            filteredScheduleList
              .filter((item) => item.status === "TEMP")
              .every((item) => selectedIds.includes(item.scheduleId))
          }
          onChange={(e) => handleCheckAll(e.target.checked)}
        />
      ),
    },
    { key: "workDate", title: "날짜" },
    { key: "staffName", title: "직원명(직원번호)" },
    { key: "departmentName", title: "부서명" },
    { key: "typeName", title: "근무유형" },
    { key: "status", title: "상태" },
    { key: "action", title: "관리" },
  ];

  // 최초 데이터 로드
  useEffect(() => {
    fetchInitData();
  }, []);

  // 주간형으로 바뀌었을 때 부서 미선택이면 첫 부서 자동 선택
  useEffect(() => {
    if (
      viewMode === "week" &&
      !selectedDepartmentId &&
      sortedDepartmentList.length > 0
    ) {
      setSelectedDepartmentId(String(sortedDepartmentList[0].departmentId));
    }
  }, [viewMode, selectedDepartmentId, sortedDepartmentList]);



  const fetchInitData = async () => {
    try {
      const [scheduleData, departmentData, staffData, scheduleTypeData] =
        await Promise.all([
          getScheduleList(),
          getDepartmentList(),
          getStaffList(),
          getSchedulePolicyList(),
        ]);

      setScheduleList(scheduleData || []);
      setDepartmentList(departmentData || []);
      setStaffList(staffData || []);
      setScheduleTypeList(scheduleTypeData || []);
    } catch (error) {
      console.error("초기 데이터 로드 실패", error);
      alert("데이터를 불러오는 중 오류가 발생했습니다");
    }
  };

  const fetchScheduleData = async () => {
    try {
      const data = await getScheduleList();
      setScheduleList(data || []);
    } catch (error) {
      console.error("스케줄목록 조회 실패", error);
    }
  };


  // 같은 직원 + 같은 날짜 중복 스케줄 여부 검사
  const hasDuplicateSchedule = (target) => {
    return scheduleList.some(
      (item) =>
        String(item.staffId) === String(target.staffId) &&
        item.workDate === target.workDate &&
        String(item.scheduleId) !== String(target.scheduleId || "")
    );
  };



  const handleOpen = () => {
    setIsEdit(false);
    setFormData(initialForm);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData(initialForm);
    setIsEdit(false);
  };

  const handleBulkOpen = () => {
    setBulkFormData(initialBulkForm);
    setBulkOpen(true);
  };

  const handleBulkClose = () => {
    setBulkFormData(initialBulkForm);
    setBulkOpen(false);
  };

  const handleAutoOpen = () => setAutoOpen(true);
  const handleAutoClose = () => setAutoOpen(false);

  const handleAutoSubmit = async (conditionData) => {
    setAutoLoading(true);
    try {
      const result = await generateAutoSchedule(conditionData);
      console.log("[AI 자동스케줄] 백엔드 응답:", result);

      setAutoResultSchedules({
        assignments: result.assignments || [],
        unassigned: result.unassigned || [],
        warnings: result.warnings || [],
        validationErrors: result.validationErrors || [],
      });
      setAutoOpen(false);
      setAutoResultOpen(true);
    } catch (error) {
      console.error("AI 스케줄 생성 실패", error);
      const message =
        error.response?.data?.message || "AI 스케줄 생성 중 오류가 발생했습니다";
      alert(message);
    } finally {
      setAutoLoading(false);
    }
  };

  const handleAutoResultCancel = () => {
    setAutoResultOpen(false);
    setAutoResultSchedules({ assignments: [], unassigned: [], warnings: [], validationErrors: [] });
  };

  const handleAutoConfirm = async () => {
    setAutoConfirmLoading(true);
    try {
      const result = await confirmAutoSchedule(autoResultSchedules.assignments);

      if (result.validationErrors && result.validationErrors.length > 0) {
        alert(
          `저장 완료 (일부 스킵됨)\n\n` +
          result.validationErrors.join("\n")
        );
      } else {
        alert("스케줄 확정 완료");
      }

      setAutoResultOpen(false);
      setAutoResultSchedules({ assignments: [], unassigned: [], warnings: [], validationErrors: [] });
      fetchScheduleData();
    } catch (error) {
      console.error("AI 스케줄 확정 실패", error);
      alert(error.response?.data?.message || "확정 중 오류가 발생했습니다");
    } finally {
      setAutoConfirmLoading(false);
    }
  };

// 저장/ 수정 / 삭제 / 확정

  const handleSubmit = async (submitData) => {
    try {
      if (hasDuplicateSchedule(submitData)) {
        alert("같은 직원의 같은 날짜 스케줄이 이미 등록되어 있습니다");
        return;
      }

      if (isEdit) {
        await updateSchedule(submitData.scheduleId, submitData);
        alert("수정완료");
      } else {
        await registerSchedule(submitData);
        alert("등록완료");
      }

      handleClose();
      fetchScheduleData();
    } catch (error) {
      console.error("저장실패", error);

      const message = 
      error.response?.data?.message || "저장 중 오류가 발생했습니다";

      alert(message);
    }
  };

  const handleEdit = (row) => {
    setIsEdit(true);
    setFormData({
      scheduleId: row.scheduleId,
      departmentId: row.departmentId || "",
      staffId: row.staffId || "",
      workDate: row.workDate || "",
      scheduleTypeId: row.scheduleTypeId || "",
      status: row.status || "TEMP",
    });
    setOpen(true);
  };

  const handleDelete = async (row) => {
    const confirmDelete = window.confirm("삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await deleteSchedule(row.scheduleId);
      alert("삭제완료");
      fetchScheduleData();
    } catch (error) {
      console.error("삭제실패", error);
      alert("삭제 중 오류가 발생했습니다");
    }
  };

  const handleConfirm = async (scheduleId) => {
    const confirmResult = window.confirm("해당 스케줄을 확정하시겠습니까?");
    if (!confirmResult) return;

    try {
      await confirmSchedule(scheduleId);
      alert("스케줄 확정완료");
      fetchScheduleData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleBulkSubmit = async (formData) => {
    try {
      const result = await bulkRegisterSchedule(formData);

      if (result.skippedList && result.skippedList.length > 0) {
        alert(
          `${result.message}\n\n` +
            result.skippedList
              .map((item) => `${item.staffName} / ${item.workDate} / ${item.reason}`)
              .join("\n")
        );
      } else {
        alert(result.message);
      }

      fetchScheduleData();
      setBulkOpen(false);
    } catch (error) {
      console.error("스케줄 일괄등록 실패", error);
      const message = 
        error.response?.data?.message || "저장 중 오류가 발생했습니다";

        alert(message);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      alert("선택된 스케줄이 없습니다");
      return;
    }

    const confirmBulk = window.confirm("선택한 스케줄을 확정하시겠습니까?");
    if (!confirmBulk) return;

    try {
      await bulkConfirmSchedule(selectedIds);
      alert("스케줄 확정 완료");
      setSelectedIds([]);
      fetchScheduleData();
    } catch (error) {
      console.error("스케줄 확정 실패", error);
      alert("스케줄 확정 중 오류가 발생했습니다");
    }
  };


// 체크박스선택
  const handleCheck = (scheduleId) => {
    setSelectedIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleCheckAll = (checked) => {
    if (checked) {
      const tempIds = filteredScheduleList
        .filter((item) => item.status === "TEMP")
        .map((item) => item.scheduleId);

      setSelectedIds(tempIds);
    } else {
      setSelectedIds([]);
    }
  };


// 날짜ㅣ이동
  const handleToday = () => {
    const today = getTodayString();
    setSelectedDate(today);
    calendarRef.current?.getApi().gotoDate(today);
  };

  const handleMonthView = () => {
    setViewMode("month");
    setSelectedDepartmentId("");
  };

  const handleWeekView = () => {
    setViewMode("week");

    if (sortedDepartmentList.length > 0) {
      setSelectedDepartmentId((prev) =>
        prev || String(sortedDepartmentList[0].departmentId)
      );
    }
  };

  const handleResetAll = () => {
    const today = getTodayString();

    setSearchKeyword("");
    setSelectedDate(today);
    setSelectedScheduleTypeId("");

    if (viewMode === "week" && sortedDepartmentList.length > 0) {
      setSelectedDepartmentId(String(sortedDepartmentList[0].departmentId));
    } else {
      setSelectedDepartmentId("");
    }
  };


  // 부서별 테이블에 표시할 데이터
  const deptTableData = (list) => {
    return list.map((item) => ({
      ...item,
      staffName: `${item.staffName} (${item.staffId})`,
      select:
        item.status === "TEMP" ? (
          <input
            type="checkbox"
            checked={selectedIds.includes(item.scheduleId)}
            onChange={() => handleCheck(item.scheduleId)}
          />
        ) : null,
      action: (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-edit"
            disabled={item.status === "CONFIRMED"}
            onClick={() => handleEdit(item)}
          >
            수정
          </button>

          <button
            type="button"
            className="btn btn-danger"
            disabled={item.status === "CONFIRMED"}
            onClick={() => handleDelete(item)}
          >
            삭제
          </button>

          {item.status === "TEMP" && (
            <button
              type="button"
              className="btn btn-confirm"
              onClick={() => handleConfirm(item.scheduleId)}
            >
              확정
            </button>
          )}
        </div>
      ),
    }));
  };

 
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>직원 스케줄 관리</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <RegisterButton onClick={handleOpen}>개별등록</RegisterButton>
          <button className="btn btn-secondary" onClick={handleBulkOpen}>일괄등록</button>
          <button className="btn btn-secondary" onClick={handleAutoOpen}>자동스케줄 조건등록</button>
          <button
            className="btn btn-confirm"
            onClick={handleBulkConfirm}
            disabled={viewMode === "week" || selectedIds.length === 0}
          >
            선택확정
          </button>
        </div>
      </div>

      <div style={styles.topBar}>
        <SearchBar
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          showButton={false}
          placeholder="직원의 이름을 입력하세요"
        />
        {/* 부서선택 */}
        <label>부서선택</label>
        <select
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          {viewMode === "month" && <option value="">전체부서</option>}

          {sortedDepartmentList.map((dept) => (
            <option key={dept.departmentId} value={dept.departmentId}>
              {dept.departmentName}
            </option>
          ))}
        </select>

        {/* 근무유형선택 */}
        <label>근무유형선택</label>
        <select
         value={selectedScheduleTypeId}
         onChange={(e)=> setSelectedScheduleTypeId(e.target.value)}
         >
            <option value="">전체</option>

            {sortedScheduleTypeList.map((type)=>
                <option 
                key={type.scheduleTypeId} 
                value={type.scheduleTypeId}
                disabled={type.isActive === false}
                >
                    {type.typeName}
                    {type.isActive === false ? " (비활성)" : ""}
                </option>
                
            )}
         </select>

        
        <button type="button" className="btn btn-secondary" onClick={handleResetAll}>
          전체 초기화
        </button>

        <button className="btn btn-secondary" onClick={handleMonthView}>달력형</button>
        <button className="btn btn-secondary" onClick={handleWeekView}>주간형</button>
      </div>

      <div style={styles.content}>
        {viewMode === "month" ? (
          <>
            {/* 달력형 왼쪽 */}
            <div style={styles.calendar}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                headerToolbar={{
                  right: "prev,next myToday",
                  center: "title",
                  left: "",
                }}
                customButtons={{
                  myToday: {
                    text: "오늘",
                    click: handleToday,
                  },
                }}
                dateClick={(info) => {
                  setSelectedDate(info.dateStr);
                }}
                height="auto"
                dayMaxEvents={true}
                dayMaxEventRows={3}
                fixedWeekCount={false}
              />
            </div>

            {/* 달력형 오른쪽 목록 */}
            <div style={styles.list}>
              <h2>{selectedDate || getTodayString()} 스케줄</h2>

              {Object.entries(groupedScheduleList).map(
                ([departmentName, items]) => (
                  <div key={departmentName}>
                    <h3>{departmentName}</h3>
                    <CommonTable columns={columns} data={deptTableData(items)} />
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          /* 주간형 */
          <div style={styles.weekWrapper}>
            {Object.entries(weekDepartmentGroups).length > 0 ? (
              Object.entries(weekDepartmentGroups).map(
                ([departmentName, items]) => (
                  <WeekScheduleTable
                    key={departmentName}
                    title={departmentName}
                    staffList={filteredWeekStaffList}
                    scheduleList={items}
                    scheduleTypeList={scheduleTypeList}
                    selectedDate={selectedDate}
                  />
                )
              )
            ) : (
              <div style={styles.emptyWeekBox}>
                표시할 주간 스케줄이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 개별 등록/수정 모달 */}
      <CommonModal open={open} onClose={handleClose}>
        <StaffScheduleForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={handleClose}
          departmentList={departmentList}
          staffList={staffList}
          scheduleTypeList={scheduleTypeList}
          isEdit={isEdit}
        />
      </CommonModal>

      {/* 일괄 등록 모달 */}
      <CommonModal open={bulkOpen} onClose={handleBulkClose}>
        <BulkScheduleForm
          formData={bulkFormData}
          setFormData={setBulkFormData}
          onSubmit={handleBulkSubmit}
          onClose={handleBulkClose}
          departmentList={departmentList}
          staffList={staffList}
          scheduleTypeList={scheduleTypeList}
        />
      </CommonModal>

      {/* AI 자동 스케줄 조건 등록 모달 */}
      <CommonModal open={autoOpen} onClose={!autoLoading ? handleAutoClose : undefined}>
        <AutoScheduleConditionForm
          onSubmit={handleAutoSubmit}
          onClose={handleAutoClose}
          departmentList={departmentList}
          isLoading={autoLoading}
        />
      </CommonModal>

      {/* AI 생성 결과 리뷰 모달 */}
      <CommonModal open={autoResultOpen} onClose={!autoConfirmLoading ? handleAutoResultCancel : undefined}>
        <AutoScheduleResultView
          assignments={autoResultSchedules.assignments}
          unassigned={autoResultSchedules.unassigned}
          warnings={autoResultSchedules.warnings}
          validationErrors={autoResultSchedules.validationErrors}
          onConfirm={handleAutoConfirm}
          onCancel={handleAutoResultCancel}
          isLoading={autoConfirmLoading}
        />
      </CommonModal>
    </div>
  );
};

export default StaffSchedulePage;

const styles = {
  container: {
    padding: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "8px",
  },
  topBar: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  content: {
    display: "flex",
    gap: "20px",
  },
  calendar: {
    flex: 1,
    background: "#fff",
    padding: "10px",
    borderRadius: "8px",
  },
  list: {
    flex: 1,
  },
  weekWrapper: {
    width: "100%",
  },
  emptyWeekBox: {
    width: "100%",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center",
    color: "#6b7280",
  },
};