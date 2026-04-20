import React, { useEffect, useState } from "react";
import CommonModal from "../common/CommonModal";

const initState = {
  staffId: "",
  userId: "",
  departmentId: "",
  managerId: "",
  position: "",
  name: "",
  phone: "",
  address: "",
  isActive:"Y",
};

const positionOptionsMap = {
  DOCTOR: [
    { value: "INTERN", label: "인턴" },
    { value: "RESIDENT", label: "레지던트" },
    { value: "FELLOW", label: "전임의" },
    { value: "SPECIALIST", label: "전문의" },
    { value: "PROFESSOR", label: "교수" },
    { value: "HEAD_DOCTOR", label: "과장" },
  ],
  NURSE: [
    { value: "NURSE", label: "일반 간호사" },
    { value: "CHARGE_NURSE", label: "책임 간호사" },
    { value: "HEAD_NURSE", label: "수간호사" },
    { value: "DIRECTOR_NURSE", label: "간호부장" },
  ],
  ADMIN: [
    { value: "STAFF", label: "사원" },
    { value: "MANAGER", label: "팀장" },
    { value: "ADMIN", label: "총관리자" },
  ],
};

const StaffForm = ({
  onSubmit,
  onClose,
  initialData,
  departmentList = [],
  staffList = [],
}) => {
  const [form, setForm] = useState(initState);

  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerKeyword, setManagerKeyword] = useState("");
  const [managerSearchResult, setManagerSearchResult] = useState([]);
  const [selectedManagerLabel, setSelectedManagerLabel] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        staffId: initialData.staffId || "",
        userId: initialData.userId || "",
        departmentId: initialData.departmentId || "",
        managerId: initialData.managerId || "",
        position: initialData.position || "",
        name: initialData.name || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        isActive: initialData.isActive ?? "Y",
      });

      const selectedManager = staffList.find(
        (staff) => Number(staff.staffId) === Number(initialData.managerId)
      );

      setSelectedManagerLabel(
        selectedManager
          ? `${selectedManager.staffId} / ${selectedManager.name || ""}`
          : ""
      );
    } else {
      setForm(initState);
      setSelectedManagerLabel("");
      setManagerKeyword("");
      setManagerSearchResult([]);
    }
  }, [initialData, staffList]);

  const handleChange = (e) => {
  const { name, value } = e.target;

    if (name === "departmentId") {
      setForm((prev) => ({
        ...prev,
        departmentId: value,
        position: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleManagerSearch = () => {
    const keyword = managerKeyword.trim().replace(/\s/g, "").toLowerCase();

    const result = staffList.filter((staff) => {
      const target = `${staff.staffId || ""} ${staff.name || ""} ${staff.position || ""}`
        .replace(/\s/g, "")
        .toLowerCase();

      if (!keyword) return true;

      return target.includes(keyword);
    });

    setManagerSearchResult(result);
  };

  const handleOpenManagerModal = () => {
    setManagerModalOpen(true);
    setManagerKeyword("");
    setManagerSearchResult(staffList);
  };

  const handleCloseManagerModal = () => {
    setManagerModalOpen(false);
    setManagerKeyword("");
    setManagerSearchResult([]);
  };

  const handleManagerSelect = (staff) => {
    setForm((prev) => ({
      ...prev,
      managerId: staff.staffId,
    }));

    setSelectedManagerLabel(`${staff.staffId} / ${staff.name || ""}`);
    handleCloseManagerModal();
  };

  const selectedDepartment = departmentList.find(
    (dept) => Number(dept.departmentId) === Number(form.departmentId)
  );

  const departmentCategory = selectedDepartment?.departmentCategory || "";
  const positionOptions = positionOptionsMap[departmentCategory] || [];

  console.log("form.departmentId:", form.departmentId);
  console.log("selectedDepartment:", selectedDepartment);
  console.log("departmentCategory:", departmentCategory);
  console.log("positionOptions:", positionOptions);

  const handleSubmit = (e) => {
    e.preventDefault();

    const requestData = {
      staffId: form.staffId ? Number(form.staffId) : null,
      userId: form.userId ? Number(form.userId) : null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      managerId: form.managerId ? Number(form.managerId) : null,
      position: form.position,
      name: form.name,
      phone: form.phone,
      address: form.address,
      isActive: form.isActive,
    };

    onSubmit(requestData);

    setForm(initState);
    setSelectedManagerLabel("");
    setManagerKeyword("");
    setManagerSearchResult([]);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <h3>직원등록</h3>

        <div style={styles.formGrid}>
          <div>
            <label>사용자ID</label>
            <input
              type="number"
              name="userId"
              value={form.userId}
              onChange={handleChange}
              placeholder="사용자ID 입력"
              disabled={!!initialData}
            />
          </div>

          <div>
            <label>부서명</label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              disabled={!!initialData}
            >
              <option value="">부서 선택</option>
              {departmentList.map((dept) => (
                <option key={dept.departmentId} value={dept.departmentId}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>담당직원ID</label>
            <div style={styles.searchRow}>
              <input
                type="text"
                value={selectedManagerLabel}
                placeholder="선택된 담당직원이 표시됩니다"
                readOnly
              />
              <button type="button" onClick={handleOpenManagerModal}>
                검색
              </button>
            </div>
          </div>

          <div>
            <label>직급</label>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
            >
              <option value="">직급선택</option>
              {positionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>이름</label>
            <input
              type="text"
              name="name"
              placeholder="이름"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>전화번호</label>
            <input
              type="text"
              name="phone"
              placeholder="전화번호"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>주소</label>
            <input
              type="text"
              name="address"
              placeholder="주소"
              value={form.address}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
                <label>상태</label>
             <select
                name="isActive"
                value={form.isActive}
                onChange={handleChange}
                >
                <option value="Y">사용</option>
                <option value="N">비활성</option>
            </select>
            </div>

        <div style={styles.buttonBox}>
          <button type="submit">{initialData ? "수정" : "등록"}</button>
          <button type="button" onClick={onClose}>
            취소
          </button>
        </div>
      </form>

      <CommonModal open={managerModalOpen}>
        <h3>담당직원 검색</h3>

        <div style={styles.searchRow}>
          <input
            type="text"
            value={managerKeyword}
            onChange={(e) => setManagerKeyword(e.target.value)}
            placeholder="이름 / ID / 직급 검색"
            style={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleManagerSearch();
              }
            }}
          />
          <button type="button" onClick={handleManagerSearch}>
            검색
          </button>
          <button type="button" onClick={handleCloseManagerModal}>
            취소
          </button>
        </div>

        <div style={styles.listBox}>
          {managerSearchResult.length === 0 ? (
            <div style={styles.emptyText}>검색 결과가 없습니다.</div>
          ) : (
            managerSearchResult.map((staff) => (
              <div
                key={staff.staffId}
                style={styles.listItem}
                onClick={() => handleManagerSelect(staff)}
              >
                <div>
                  <strong>{staff.name || "-"}</strong>
                </div>
                <div>ID: {staff.staffId}</div>
                <div>{staff.position || "-"}</div>
              </div>
            ))
          )}
        </div>
      </CommonModal>
    </>
  );
};

export default StaffForm;

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