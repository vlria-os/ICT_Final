import React, { useEffect, useState } from "react";
import RegisterButton from "../../../components/common/RegisterButton";
import SearchBar from "../../../components/common/SearchBar";
import CommonTable from "../../../components/common/CommonTable";
import CommonModal from "../../../components/common/CommonModal";
import {
  getDepartmentList,
  registerDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../../api/hr/departmentApi";
import DepartmentForm from "../../../components/form/DepartmentForm";

const DepartmentPage = () => {
  const [departmentList, setDepartmentList] = useState([]);
  const [originalDepartmentList, setOriginalDepartmentList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");


  useEffect(() => {
    loadDepartmentList();
  }, []);


  const loadDepartmentList = async () => {
    try {
      const data = await getDepartmentList();

      const sefeData = Array.isArray(data)? data : []

      const mappedData = data.map((item) => ({
        departmentId: item.departmentId,
        departmentCategory: item.departmentCategory,
        departmentName: item.departmentName,
        location: item.location,
        status: item.status,
        action: (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn btn-edit"
              disabled={item.status === "N"}
              onClick={() => handleEdit(item)}
            >
              수정
            </button>

            <button
              type="button"
              className="btn btn-danger"
              disabled={item.status === "N"}
              onClick={() => handleDelete(item.departmentId)}
            >
              삭제
            </button>
          </div>
        ),
      }));

      setDepartmentList(mappedData);
      setOriginalDepartmentList(mappedData);
    } catch (error) {
      console.error("부서 목록 조회 실패", error);
      setDepartmentList([]);
    }
  };

  const handleOpen = () => {
    setSelectedDepartment(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDepartment(null);
  };

  const handleEdit = (department) => {
    setSelectedDepartment(department);
    setOpen(true);
  };

// 저장 / 삭제
  const handleSubmit = async (departmentData) => {
    try {
      if (selectedDepartment) {
        await updateDepartment(departmentData);
      } else {
        await registerDepartment(departmentData);
      }

      await loadDepartmentList();
      handleClose();
    } catch (error) {
      console.error("부서 저장 실패", error);
    }
  };

  const handleDelete = async (departmentId) => {
    const confirmDelete = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await deleteDepartment(departmentId);
      await loadDepartmentList();
    } catch (error) {
      console.error("부서 삭제 실패", error);
    }
  };

// 검색
  const handleSearch = () => {
    const keyword = searchKeyword.replace(/\s/g, "").toLowerCase();

    if (!keyword) {
      setDepartmentList(originalDepartmentList);
      return;
    }

    const matched = originalDepartmentList.filter((item) =>
      (item.departmentName || "")
        .replace(/\s/g, "")
        .toLowerCase()
        .includes(keyword)
    );

    if (matched.length === 0) {
      alert("검색 결과가 없습니다");
      setDepartmentList([]);
      return;
    }

    setDepartmentList(matched);
  };

  const handleResetSearch = () => {
    setSearchKeyword("");
    setDepartmentList(originalDepartmentList);
  };

  const columns = [
    { key: "departmentId", title: "번호" },
    { key: "departmentName", title: "부서명" },
    { key: "departmentCategory", title: "카테고리" },
    { key: "location", title: "위치" },
    { key: "status", title: "상태" },
    { key: "action", title: "관리" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>부서관리</h2>
        <RegisterButton onClick={handleOpen} />
      </div>

      <div style={styles.topBar}>
        <SearchBar
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          placeholder="부서명을 입력하세요"
        />
        <button type="button" className="btn btn-secondary" onClick={handleResetSearch}>
          전체보기
        </button>
      </div>

      <CommonTable columns={columns} data={departmentList} />

      <CommonModal open={open} onClose={handleClose}>
        <DepartmentForm
          onSubmit={handleSubmit}
          onClose={handleClose}
          initialData={selectedDepartment}
        />
      </CommonModal>
    </div>
  );
};

export default DepartmentPage;

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
  },
};