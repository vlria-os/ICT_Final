import React, { useEffect, useState } from "react";
import RegisterButton from "../../components/common/RegisterButton";
import SearchBar from "../../components/common/SearchBar";
import CommonTable from "../../components/common/CommonTable";
import CommonModal from "../../components/common/CommonModal";
import DepartmentSchedulePolicyForm from "../../components/form/DepartmentSchedulePolicyForm";
import {
  getDepartmentSchedulePolicyList,
  registerDepartmentSchedulePolicy,
  updateDepartmentSchedulePolicy,
  deactivateDepartmentSchedulePolicy,
} from "../../api/hr/departmentSchedulePolicyApi";

const DepartmentSchedulePolicyPage = () => {
  const [policyList, setPolicyList] = useState([]);
  const [originalPolicyList, setOriginalPolicyList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    loadPolicyList();
  }, []);

  const loadPolicyList = async () => {
    try {
      const data = await getDepartmentSchedulePolicyList();
      const list = Array.isArray(data) ? data : [];

      const mappedData = list.map((item) => ({
        ...item,
        shiftTypesText: item.shiftTypes ? item.shiftTypes.join(", ") : "-",
        isActiveText: item.isActive ? "활성" : "비활성",
        action: (
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" onClick={() => handleEdit(item)}>
              수정
            </button>
            <button type="button" onClick={() => handleToggleActive(item)}>
              {item.isActive ? "비활성" : "활성"}
            </button>
          </div>
        ),
      }));

      setPolicyList(mappedData);
      setOriginalPolicyList(mappedData);
    } catch (error) {
      console.error("부서 스케줄 정책 목록 조회 실패", error);
      setPolicyList([]);
    }
  };

  const handleOpen = () => {
    setSelectedPolicy(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPolicy(null);
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setOpen(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (selectedPolicy) {
        await updateDepartmentSchedulePolicy(data.departmentId, data);
      } else {
        await registerDepartmentSchedulePolicy(data);
      }
      await loadPolicyList();
      handleClose();
    } catch (error) {
      console.error("부서 스케줄 정책 저장 실패", error);
      alert(error?.response?.data?.message || "저장 중 오류가 발생했습니다");
    }
  };

  const handleToggleActive = async (item) => {
    const confirmMsg = item.isActive
      ? "이 정책을 비활성 처리하시겠습니까?"
      : "이 정책을 다시 활성화하시겠습니까?";

    if (!window.confirm(confirmMsg)) return;

    try {
      if (item.isActive) {
        // 비활성화: softDelete (DELETE)
        await deactivateDepartmentSchedulePolicy(item.departmentId);
      } else {
        // 재활성화: DTO 필드만 추려서 PUT
        await updateDepartmentSchedulePolicy(item.departmentId, {
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          jobType: item.jobType,
          shiftTypes: item.shiftTypes,
          minStaffMap: item.minStaffMap,
          maxConsecutiveNight: item.maxConsecutiveNight,
          blockNightToDay: item.blockNightToDay,
          blockNightToEvening: item.blockNightToEvening,
          maxWorkDaysPerWeek: item.maxWorkDaysPerWeek,
          isActive: true,
        });
      }
      await loadPolicyList();
    } catch (error) {
      console.error("상태 변경 실패", error);
      alert("상태 변경 중 오류가 발생했습니다");
    }
  };

  const handleSearch = () => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      setPolicyList(originalPolicyList);
      return;
    }

    const matched = originalPolicyList.filter(
      (item) =>
        (item.departmentName || "").toLowerCase().includes(keyword) ||
        (item.jobType || "").toLowerCase().includes(keyword)
    );

    if (matched.length === 0) {
      alert("검색 결과가 없습니다");
      setPolicyList([]);
      return;
    }

    setPolicyList(matched);
  };

  const handleResetSearch = () => {
    setSearchKeyword("");
    setPolicyList(originalPolicyList);
  };

  const columns = [
    { key: "departmentId", title: "번호" },
    { key: "departmentName", title: "부서명" },
    { key: "jobType", title: "직무유형" },
    { key: "shiftTypesText", title: "허용 근무유형" },
    { key: "maxWorkDaysPerWeek", title: "주 최대 근무일" },
    { key: "maxConsecutiveNight", title: "최대 연속 야간" },
    { key: "isActiveText", title: "상태" },
    { key: "action", title: "관리" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>부서별 스케줄 정책</h2>
        <RegisterButton onClick={handleOpen} />
      </div>

      <div style={styles.topBar}>
        <SearchBar
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          placeholder="부서명 또는 직무유형을 입력하세요"
        />
        <button type="button" onClick={handleResetSearch}>
          전체보기
        </button>
      </div>

      <CommonTable columns={columns} data={policyList} />

      <CommonModal open={open} onClose={handleClose}>
        <DepartmentSchedulePolicyForm
          onSubmit={handleSubmit}
          onClose={handleClose}
          initialData={selectedPolicy}
        />
      </CommonModal>
    </div>
  );
};

export default DepartmentSchedulePolicyPage;

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
