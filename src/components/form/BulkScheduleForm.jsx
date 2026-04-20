import React, { useMemo, useState } from 'react'

const BulkScheduleForm = ({
    formData,
    setFormData,
    onSubmit,
    onClose,
    departmentList =[],
    staffList =[],
    scheduleTypeList = [],
}) => {
    const [staffKeyword, setStaffKeyword] = useState("");

    const filteredStaffList = useMemo(()=>{
        return staffList.filter((staff)=>{
            const matchKeyword = (staff.name || "").includes(staffKeyword);
            const matchDepartment = formData.departmentId? String(staff.departmentId)== String (formData.departmentId) : true;

            return matchKeyword && matchDepartment;
        });
    },[staffList, staffKeyword, formData.departmentId]);

    const handleChange=(e)=>{
        const {name,value} = e.target;
        setFormData((prev)=>({
            ...prev,
            [name]:value,
        }));
    };

    const handleStaffCheck = (staffId) =>{
        setFormData((prev)=>{
            const currentIds = prev.staffIds || [];
            const exists = currentIds.includes(staffId);

            return {
                ...prev,
                staffIds: exists ? currentIds.filter((id)=> id != staffId) 
                :[...currentIds, staffId],
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if(!formData.departmentId){
            alert("부서를 선택해주세요");
            return;
        }

        if(!formData.staffIds || formData.staffIds.length == 0){
            alert("직원을 한 명 이상 선택해주세요");
            return;
        }

        if(!formData.startDate){
            alert("시작일을 선택해주세요");
            return;
        }

        if(!formData.endDate){
            alert("종료일을 선택해주세요");
            return;
        }
        
        if(formData.startDate > formData.endDate){
            alert("시작일은 종료일보다 늦을 수 없습니다");
            return;
        }
        if(!formData.scheduleTypeId){
            alert("근무유형을 선택해주세요");
            return;
        }
        onSubmit(formData);
    };
    


  return (
    <form onSubmit={handleSubmit}>
        <h3>직원 스케줄 일괄등록</h3>

        <div style={styles.formGrid}>
            <div>
                <label>부서</label>
                <select
                name='departmentId'
                placeholder='부서명를 선택하세요'
                value={formData.departmentId || ""}
                onChange={handleChange}
                >
                    <option value="">부서선택</option>
                    {departmentList.map((dept)=>(
                        <option key={dept.departmentId} value={dept.departmentId}>
                            {dept.departmentName}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label>직원검색</label>
                <input
                type='text'
                value={staffKeyword}
                onChange={(e)=> setStaffKeyword(e.target.value)}
                placeholder='직원명 검색'
                />
            </div>

            <div>
                <label>직원 선택</label>
                <div style={styles.staffBox}>
                    {filteredStaffList.length==0?(
                        <div>선택 가능한 직원이 없습니다</div>
                    ) : (
                        filteredStaffList.map((staff)=>(
                            <label key={staff.staffId} style={styles.staffItem}>
                                <input
                                type='checkbox'
                                checked={(formData.staffIds || []).includes(staff.staffId)}
                                onChange={()=> handleStaffCheck(staff.staffId)}
                                />
                                <span>{staff.name}</span>
                            </label>
                        ))
                    )}
                </div>
            </div>

            <div>
                <label>시작일</label>
                <input
                type='date'
                name='startDate'
                value={formData.startDate || ""}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>종료일</label>
                <input
                type='date'
                name='endDate'
                value={formData.endDate || ""}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>근무유형</label>
                <select
                name='scheduleTypeId'
                value={formData.scheduleTypeId || ""}
                onChange={handleChange}
                >
                    <option value="">근무유형 선택</option>
                    {scheduleTypeList.map((type)=>(
                        <option
                        key={type.scheduleTypeId}
                        value={type.scheduleTypeId}
                        disabled = {type.isActive === false}
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
                name='status'
                value={formData.status ||""}
                onChange={handleChange}
                >
                    <option value="TEMP">임시</option>
                    <option value="CONFIRMED">확정</option>
                </select>
            </div>

            <div style={styles.buttonBox}>
                <button type="submit">일괄등록</button>
                <button type="button" onClick={onClose}>
                취소
                </button>
            </div>
        </div>
    </form>
  )
}

export default BulkScheduleForm

const styles = {
  formGrid: {
    display: "grid",
    gap: "10px",
  },
  buttonBox: {
    marginTop: "16px",
    display: "flex",
    gap: "8px",
  },
    staffBox: {
    maxHeight: "180px",
    overflowY: "auto",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "8px",
    display: "grid",
    gap: "6px",
  },
  staffItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};