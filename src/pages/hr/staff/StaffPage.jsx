import React, { useEffect, useMemo, useState } from "react";
import StaffForm from "../../../components/form/StaffForm";
import CommonModal from "../../../components/common/CommonModal";
import CommonTable from "../../../components/common/CommonTable";
import RegisterButton from "../../../components/common/RegisterButton";
import SearchBar from "../../../components/common/SearchBar";
import {
  getStaffList,
  registerStaff,
  updateStaff,
} from "../../../api/hr/staffApi";
import { getDepartmentList } from "../../../api/hr/departmentApi";
import StaffBulkUpload from "../../../components/hr/StaffBulkUpload";

const StaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [originalStaffList, setOriginalStaffList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);

  const [open, setOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchCandidates, setSearchCandidates] = useState([]);


  // 부서 목록 가나다순으로 정렬
  const sortedDepartmentList = useMemo(() => {
    return [...departmentList].sort((a, b) =>
      (a.departmentName || "").localeCompare(b.departmentName || "", "ko")
    );
  }, [departmentList]);

  // 부서 + 이름 검색이 반영된 직원 목록
  const sortedFilteredStaffList = useMemo(() => {
    let result = [...originalStaffList];

    // 부서 필터
    if (selectedDepartmentId) {
      result = result.filter(
        (item) => String(item.departmentId) === String(selectedDepartmentId)
      );
    }

    // 이름 검색
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();

      result = result.filter((item) =>
        (item.name || "").toLowerCase().includes(keyword)
      );
    }

    // 이름 -> 직원번호 순 정렬
    result.sort((a, b) => {
      const nameCompare = (a.name || "").localeCompare(b.name || "", "ko");
      if (nameCompare !== 0) return nameCompare;

      return Number(a.staffId) - Number(b.staffId);
    });

    return result;
  }, [originalStaffList, selectedDepartmentId, searchKeyword]);

  // 테이블 컬럼 정의
  const columns = [
    { key: "id", title: "직원번호" },
    { key: "userId", title: "사용자ID" },
    { key: "departmentName", title: "부서명" },
    { key: "managerId", title: "담당직원ID" },
    { key: "position", title: "직급" },
    { key: "name", title: "이름" },
    { key: "phone", title: "전화번호" },
    { key: "address", title: "주소" },
    { key: "isActiveText", title: "상태" },
    { key: "action", title: "관리" },
  ];


  // 직원 목록, 부서 목록 조회
  useEffect(() => {
    loadStaffList();
    loadDepartmentList();
  }, []);

  useEffect(() => {
    setStaffList(sortedFilteredStaffList);
  }, [sortedFilteredStaffList]);


  const loadStaffList = async () => {
    try {
      const data = await getStaffList();

      const mappedData = data.map((item) => ({
        id: item.staffId,
        staffId: item.staffId,
        userId: item.userId,
        departmentId: item.departmentId,
        departmentName: item.departmentName,
        managerId: item.managerId,
        position: item.position,
        name: item.name,
        phone: item.phone,
        address: item.address,
        isActive: item.isActive,
        isActiveText: item.isActive === "Y" ? "사용" : "비활성(퇴사)",

        action: (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn btn-edit"
              disabled={item.isActive === "N"}
              onClick={() => handleEdit(item)}
            >
              수정
            </button>

            <button
              type="button"
              className={item.isActive === "Y" ? "btn btn-danger" : "btn btn-success"}
              onClick={() => handleToggleActive(item)}
            >
              {item.isActive === "Y" ? "비활성(퇴사)" : "활성"}
            </button>
          </div>
        ),
      }));

      setOriginalStaffList(mappedData);
      setStaffList(mappedData);
    } catch (error) {
      console.error("직원 목록 조회 실패", error);
    }
  };

  // 부서 목록 조회
  const loadDepartmentList = async () => {
    try {
      const data = await getDepartmentList();
      setDepartmentList((data || []).filter(d => d.status !== "N"));
    } catch (error) {
      console.error("부서 목록 조회 실패", error);
    }
  };


  // 등록 모달 열기
  const handleOpen = () => {
    setSelectedStaff(null);
    setOpen(true);
  };

  // 등록/수정 모달 닫기
  const handleClose = () => {
    setOpen(false);
    setSelectedStaff(null);
  };

  // 수정 모달 열기
  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setOpen(true);
  };


  // 직원 등록/수정 저장
  const handleSubmit = async (staffData) => {
    try {
      if (selectedStaff) {
        await updateStaff(staffData);
      } else {
        await registerStaff(staffData);
      }

      await loadStaffList();
      handleClose();
    } catch (error) {
      console.error("직원 저장 실패", error);
    }
  };

  // 활성/비활성 토글
  const handleToggleActive = async (item) => {
    const nextIsActive = item.isActive === "Y" ? "N" : "Y";

    const confirmMsg =
      item.isActive === "Y"
        ? "이 직원을 비활성(퇴사)처리하시겠습니까?"
        : "이 직원을 다시 활성화하시겠습니까?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const requestData = {
        staffId: item.staffId,
        userId: item.userId,
        departmentId: item.departmentId,
        managerId: item.managerId,
        position: item.position,
        name: item.name,
        phone: item.phone,
        address: item.address,
        isActive: nextIsActive,
      };

      await updateStaff(requestData);
      await loadStaffList();
    } catch (error) {
      console.error("활성 상태 변경 실패", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };



  // 검색 버튼 클릭 시 동명이인 처리
  const handleSearch = () => {
    const keyword = searchKeyword.trim().toLowerCase();

    let baseList = [...originalStaffList];

    if (selectedDepartmentId) {
      baseList = baseList.filter(
        (item) => String(item.departmentId) === String(selectedDepartmentId)
      );
    }

    // 검색어가 없으면 전체 정렬 목록으로 복원
    if (!keyword) {
      const sortedList = baseList.sort((a, b) => {
        const nameCompare = (a.name || "").localeCompare(b.name || "", "ko");
        if (nameCompare !== 0) return nameCompare;

        return Number(a.staffId) - Number(b.staffId);
      });

      setStaffList(sortedList);
      return;
    }

    const matched = baseList
      .filter((item) => (item.name || "").toLowerCase().includes(keyword))
      .sort((a, b) => {
        const nameCompare = (a.name || "").localeCompare(b.name || "", "ko");
        if (nameCompare !== 0) return nameCompare;

        return Number(a.staffId) - Number(b.staffId);
      });

    if (matched.length === 0) {
      alert("검색 결과가 없습니다.");
      setStaffList([]);
      return;
    }

    if (matched.length === 1) {
      setStaffList(matched);
      return;
    }

    // 동명이인이 여러 명이면 선택 모달 오픈
    setSearchCandidates(matched);
    setSearchModalOpen(true);
  };

  // 동명이인 목록에서 한 명 선택
  const handleSelectCandidate = (staff) => {
    setStaffList([staff]);
    setSearchModalOpen(false);
    setSearchCandidates([]);
  };

  // 검색/필터 전체 초기화
  const handleResetSearch = () => {
    setSearchKeyword("");
    setSelectedDepartmentId("");
    setSearchCandidates([]);
    setSearchModalOpen(false);

    const resetList = [...originalStaffList].sort((a, b) => {
      const nameCompare = (a.name || "").localeCompare(b.name || "", "ko");
      if (nameCompare !== 0) return nameCompare;

      return Number(a.staffId) - Number(b.staffId);
    });

    setStaffList(resetList);
  };


  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>직원 관리</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setBulkOpen(true)}>
            일괄등록
          </button>
          <RegisterButton onClick={handleOpen} />
        </div>
      </div>

      <div style={styles.topBar}>
        <SearchBar
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          placeholder="이름으로 검색"
        />

        <select
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          <option value="">전체부서</option>
          {sortedDepartmentList.map((dept) => (
            <option key={dept.departmentId} value={dept.departmentId}>
              {dept.departmentName}
            </option>
          ))}
        </select>

        <button type="button" className="btn btn-secondary" onClick={handleResetSearch}>
          전체보기
        </button>
      </div>

      <CommonTable columns={columns} data={staffList} />

      {/* 직원 등록/수정 모달 */}
      <CommonModal open={open} onClose={handleClose}>
        <StaffForm
          onSubmit={handleSubmit}
          onClose={handleClose}
          initialData={selectedStaff}
          departmentList={departmentList}
          staffList={originalStaffList}
        />
      </CommonModal>
      
      {/* 일괄등록 모달 */}
      <StaffBulkUpload
      open={bulkOpen}
      onClose={()=>setBulkOpen(false)}
      onSuccess={loadStaffList}
      ></StaffBulkUpload>

      {/* 동명이인 선택 모달 */}
      <CommonModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      >
        <h3>동명이인 선택</h3>
        <p>직원번호 / 이름 / 부서명 / 전화번호</p>

        <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {searchCandidates.map((staff) => (
            <button
              key={staff.staffId}
              type="button"
              onClick={() => handleSelectCandidate(staff)}
              style={styles.candidateButton}
            >
              {staff.staffId} / {staff.name} / {staff.departmentName} /{" "}
              {staff.phone}
            </button>
          ))}
        </div>
      </CommonModal>
    </div>
  );
};

export default StaffPage;

const styles = {
  container: {
    padding: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  topBar: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  candidateButton: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
  },
};