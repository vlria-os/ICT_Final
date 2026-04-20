import React, { useEffect, useState } from "react";
import CommonModal from "../common/CommonModal";

const StaffScheduleForm = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  departmentList = [],
  staffList = [],
  scheduleTypeList = [],
  isEdit,
}) => {
  const [staffKeyword, setStaffKeyword] = useState("");
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSearchResult, setStaffSearchResult] = useState([]);
  const [selectedStaffLabel, setSelectedStaffLabel] = useState("");

  const selectedDepartment = departmentList.find(
    (dept) => String(dept.departmentId) === String(formData.departmentId)
  );

  useEffect(() => {
    if (!formData.staffId) {
      setSelectedStaffLabel("");
      return;
    }

    const selectedStaff = staffList.find(
      (staff) => String(staff.staffId) === String(formData.staffId)
    );

    setSelectedStaffLabel(
      selectedStaff
        ? `${selectedStaff.staffId} / ${selectedStaff.name || ""}`
        : ""
    );
  }, [formData.staffId, staffList]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "departmentId") {
      setFormData((prev) => ({
        ...prev,
        departmentId: value,
        staffId: "",
      }));
      setSelectedStaffLabel("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getFilteredStaffList = () => {
    const keyword = staffKeyword
      .trim()
      .replace(/\s/g, "")
      .toLowerCase();

    return staffList.filter((staff) => {
      const matchDepartment = formData.departmentId
        ? String(staff.departmentId) === String(formData.departmentId)
        : true;

      if (!keyword) return matchDepartment;

      const target = `${staff.staffId || ""} ${staff.name || ""} ${staff.position || ""}`
        .replace(/\s/g, "")
        .toLowerCase();

      return matchDepartment && target.includes(keyword);
    });
  };

  const handleOpenStaffModal = () => {
    setStaffModalOpen(true);
    setStaffKeyword("");

    const initialList = staffList.filter((staff) =>
      formData.departmentId
        ? String(staff.departmentId) === String(formData.departmentId)
        : true
    );

    setStaffSearchResult(initialList);
  };

  const handleStaffSearch = () => {
    const result = getFilteredStaffList();
    setStaffSearchResult(result);
  };

  const handleStaffSelect = (staff) => {
    setFormData((prev) => ({
      ...prev,
      staffId: staff.staffId,
      departmentId: prev.departmentId || staff.departmentId,
    }));

    setSelectedStaffLabel(`${staff.staffId} / ${staff.name || ""}`);
    setStaffModalOpen(false);
    setStaffKeyword("");
    setStaffSearchResult([]);
  };

  const handleCloseStaffModal = () => {
    setStaffModalOpen(false);
    setStaffKeyword("");
    setStaffSearchResult([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.departmentId) {
      alert("부서를 선택해주세요");
      return;
    }

    if (!formData.staffId) {
      alert("직원을 선택해주세요");
      return;
    }

    if (!formData.workDate) {
      alert("날짜를 선택해주세요");
      return;
    }

    if (!formData.scheduleTypeId) {
      alert("근무유형을 선택해주세요");
      return;
    }

    onSubmit({
      ...formData,
      departmentId: formData.departmentId ? Number(formData.departmentId) : null,
      staffId: formData.staffId ? Number(formData.staffId) : null,
      scheduleTypeId: formData.scheduleTypeId
        ? Number(formData.scheduleTypeId)
        : null,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <h3>직원 스케줄 등록</h3>

        <div style={styles.formGrid}>
          <div>
            <label>부서</label>
            <select
              name="departmentId"
              value={formData.departmentId || ""}
              onChange={handleChange}
            >
              <option value="">부서선택</option>
              {departmentList.map((dept) => (
                <option key={dept.departmentId} value={dept.departmentId}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>직원명</label>
            <div style={styles.searchRow}>
              <input
                type="text"
                value={selectedStaffLabel}
                placeholder={
                  formData.departmentId
                    ? `${selectedDepartment?.departmentName || ""} 직원 선택`
                    : "선택된 직원이 표시됩니다"
                }
                readOnly
              />
              <button type="button" onClick={handleOpenStaffModal}>
                검색
              </button>
            </div>
          </div>

          <div>
            <label>날짜</label>
            <input
              type="date"
              name="workDate"
              value={formData.workDate || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>근무유형</label>
            <select
              name="scheduleTypeId"
              value={formData.scheduleTypeId || ""}
              onChange={handleChange}
            >
              <option value="">근무유형 선택</option>
              {scheduleTypeList.map((type) => (
                <option 
                key={type.scheduleTypeId} 
                value={type.scheduleTypeId}
                disabled={type.isActive === false}
                >
                  {type.typeName}
                  {type.isActive === false ? "(비활성)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>상태</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleChange}
              disabled={isEdit}
            >
              <option value="TEMP">임시</option>
              <option value="CONFIRMED">확정</option>
            </select>
          </div>
        </div>

        <div style={styles.buttonBox}>
          <button type="submit">등록</button>
          <button type="button" onClick={onClose}>
            취소
          </button>
        </div>
      </form>

      <CommonModal open={staffModalOpen}>
        <h3>직원 검색</h3>

        <div style={styles.searchRow}>
          <input
            type="text"
            value={staffKeyword}
            onChange={(e) => setStaffKeyword(e.target.value)}
            placeholder="이름 / 직원번호 / 직급 검색"
            
            style={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleStaffSearch();
              }
            }}
          />
          <button type="button" onClick={handleStaffSearch}>
            검색
          </button>
          <button type="button" onClick={handleCloseStaffModal}>취소</button>
        </div>

        <div style={styles.filterInfo}>
          {formData.departmentId
            ? `현재 부서 필터: ${selectedDepartment?.departmentName || "-"}`
            : "현재 전체 직원 검색"}
        </div>

        <div style={styles.listBox}>
          {staffSearchResult.length === 0 ? (
            <div style={styles.emptyText}>검색 결과가 없습니다.</div>
          ) : (
            staffSearchResult.map((staff) => (
              <div
                key={staff.staffId}
                style={styles.listItem}
                onClick={() => handleStaffSelect(staff)}
              >
                <div>
                  <strong>{staff.name || "-"}</strong>
                </div>
                <div>ID: {staff.staffId}</div>
                <div>부서: {staff.departmentName || "-"}</div>
                <div>직급: {staff.position || "-"}</div>
              </div>
            ))
          )}
        </div>
      </CommonModal>
    </>
  );
};

export default StaffScheduleForm;

const styles = {
  formGrid: {
    display: "grid",
    gap: "10px",
  },
  searchRow: {
    display: "flex",
    gap: "8px",
  },
  buttonBox: {
    marginTop: "16px",
    display: "flex",
    gap: "8px",
  },
  searchInput: {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
  },
  filterInfo: {
    fontSize: "14px",
    color: "#555",
    marginTop: "8px",
  },
  listBox: {
    border: "1px solid #ddd",
    borderRadius: "6px",
    overflowY: "auto",
    maxHeight: "320px",
    marginTop: "12px",
  },
  listItem: {
    padding: "12px",
    borderBottom: "1px solid #eee",
    cursor: "pointer",
  },
  emptyText: {
    padding: "20px",
    textAlign: "center",
    color: "#777",
  },
};