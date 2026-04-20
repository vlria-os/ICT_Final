import React, { useEffect, useState } from "react";
import RegisterButton from "../../components/common/RegisterButton";
import SearchBar from "../../components/common/SearchBar";
import CommonTable from "../../components/common/CommonTable";
import CommonModal from "../../components/common/CommonModal";
import SchedulePolicyForm from "../../components/form/SchedulePolicyForm";
import {
  getSchedulePolicyList,
  registerSchedulePolicy,
  updateSchedulePolicy,
} from "../../api/hr/schedulePolicyApi";

const Schedule_policyPage = () => {
  const [schedulePolicyList, setSchedulePolicyList] = useState([]);
  const [originalSchedulePolicyList, setOriginalSchedulePolicyList] = useState(
    []
  );
  const [open, setOpen] = useState(false);
  const [selectedSchedulePolicy, setSelectedSchedulePolicy] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");


  useEffect(() => {
    loadSchedulePolicyList();
  }, []);


  const loadSchedulePolicyList = async () => {
    try {
      const data = await getSchedulePolicyList();

      const mappedData = data.map((item) => ({
        scheduleTypeId: item.scheduleTypeId,
        typeCode: item.typeCode,
        typeName: item.typeName,
        startTime: item.startTime,
        endTime: item.endTime,
        isActive: item.isActive,
        isActiveText: item.isActive ? "사용" : "비활성",
        createdAt: item.createdAt
          ? item.createdAt.replace("T", " ").slice(0, 16)
          : "",
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

      setSchedulePolicyList(mappedData);
      setOriginalSchedulePolicyList(mappedData);
    } catch (error) {
      console.error("근무유형 목록 조회 실패", error);
    }
  };


  const handleOpen = () => {
    setSelectedSchedulePolicy(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSchedulePolicy(null);
  };

  const handleEdit = (schedulePolicy) => {
    setSelectedSchedulePolicy(schedulePolicy);
    setOpen(true);
  };

//  저장 / 상태변경
  const handleSubmit = async (schedulePolicyData) => {
    try {
      if (selectedSchedulePolicy) {
        await updateSchedulePolicy(
          schedulePolicyData.scheduleTypeId,
          schedulePolicyData
        );
      } else {
        await registerSchedulePolicy(schedulePolicyData);
      }

      await loadSchedulePolicyList();
      handleClose();
    } catch (error) {
      console.error("근무유형 저장 실패", error);
      alert(error?.response?.data?.message || "저장 중 오류가 발생했습니다");
    }
  };

  const handleToggleActive = async (item) => {
    const confirmMsg = item.isActive
      ? "이 근무유형을 비활성처리하시겠습니까?"
      : "이 근무유형을 다시 활성화하시겠습니까?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const requestData = {
        scheduleTypeId: item.scheduleTypeId,
        typeCode: item.typeCode,
        typeName: item.typeName,
        startTime: item.startTime,
        endTime: item.endTime,
        isActive: !item.isActive,
      };

      await updateSchedulePolicy(item.scheduleTypeId, requestData);
      await loadSchedulePolicyList();
    } catch (error) {
      console.error("활성 상태 변경 실패", error);
      alert("상태 변경 중 오류가 발생했습니다");
    }
  };

// 검색
  const handleSearch = () => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      setSchedulePolicyList(originalSchedulePolicyList);
      return;
    }

    const matched = originalSchedulePolicyList.filter(
      (item) =>
        item.typeCode.toLowerCase().includes(keyword) ||
        item.typeName.toLowerCase().includes(keyword)
    );

    if (matched.length === 0) {
      alert("검색 결과가 없습니다");
      setSchedulePolicyList([]);
      return;
    }

    setSchedulePolicyList(matched);
  };

  const handleResetSearch = () => {
    setSearchKeyword("");
    setSchedulePolicyList(originalSchedulePolicyList);
  };


  const columns = [
    { key: "scheduleTypeId", title: "번호" },
    { key: "typeCode", title: "코드" },
    { key: "typeName", title: "근무유형" },
    { key: "startTime", title: "시작시간" },
    { key: "endTime", title: "종료시간" },
    { key: "isActiveText", title: "상태" },
    { key: "createdAt", title: "등록일" },
    { key: "action", title: "관리" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>스케줄 운영관리</h2>
        <RegisterButton onClick={handleOpen} />
      </div>

      <div style={styles.topBar}>
        <SearchBar
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          placeholder="근무 유형을 입력하세요"
        />
        <button type="button" onClick={handleResetSearch}>
          전체보기
        </button>
      </div>

      <CommonTable columns={columns} data={schedulePolicyList} />

      <CommonModal open={open} onClose={handleClose}>
        <SchedulePolicyForm
          onSubmit={handleSubmit}
          onClose={handleClose}
          initialData={selectedSchedulePolicy}
        />
      </CommonModal>
    </div>
  );
};

export default Schedule_policyPage;

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