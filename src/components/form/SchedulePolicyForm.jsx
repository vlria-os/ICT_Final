import React, { useEffect, useState } from 'react'

    const initState={
        scheduleTypeId:"",
        typeCode:"",
        typeName:"",
        startTime:"",
        endTime:"",
        createdAt:"",
        isActive:true,
    };

const SchedulePolicyForm = ({onSubmit, onClose, initialData}) => {
    const [form, setForm] = useState(initState);

    useEffect(()=>{
        if(initialData){
            setForm({
                scheduleTypeId:initialData.scheduleTypeId || "",
                typeCode:initialData.typeCode || "",
                typeName:initialData.typeName || "",
                startTime:initialData.startTime || "",
                endTime:initialData.endTime || "",
                createdAt:initialData.createdAt || "",
                isActive:initialData.isActive !== null && initialData.isActive !== undefined?
                initialData.isActive : true,
            });
        }else {
            setForm(initState);
        }
    },[initialData]);

    const handleChange = (e) => {
        const {name, value} = e.target;

        if(name =="isActive"){
            setForm({
                ...form,
                isActive:value == "true",
            });
            return;
        }

        if(name =="typeCode"){
            setForm({
                ...form,
                typeCode:value.toUpperCase(),
            });
            return;
        }
        setForm({
            ...form,
            [name] : value,
        });
    };

    const handleSubmit = (e) =>{
        e.preventDefault();

        if(!form.typeCode.trim()){
            alert("근무유형 코드를 입력하세요");
            return;
        }
        if(!form.typeName.trim()){
            alert("근무유형명을 입력하세요");
            return;
        }
        
        const requestData = {
            scheduleTypeId: form.scheduleTypeId ? Number(form.scheduleTypeId):null,
            typeCode: form.typeCode.trim(),
            typeName: form.typeName.trim(),
            startTime: form.startTime,
            endTime: form.endTime,
            createdAt: form.createdAt,
            isActive: form.isActive,
        };

        onSubmit(requestData);
        setForm(initState);
    };

  return (
    <form onSubmit={handleSubmit}>
        <h3>근무유형 등록</h3>
        <div style={styles.formGrid}>
            <div>
                <label>근무유형 코드</label>
                <input
                type='text'
                name='typeCode'
                placeholder='예: DAY, NIGHT, OFF'
                value={form.typeCode}
                onChange={handleChange}
                disabled={!!initialData}
                />
            </div>

            <div>
                <label>근무유형명</label>
                <input
                type='text'
                name='typeName'
                placeholder='예: 주간근무'
                value={form.typeName}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>시작시간</label>
                <input
                type='time'
                name='startTime'
                value={form.startTime}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>종료시간</label>
                <input
                type='time'
                name='endTime'
                value={form.endTime}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>상태</label>
             <select
                name="isActive"
                value={String(form.isActive)}
                onChange={handleChange}
                >
                <option value="true">사용</option>
                <option value="false">비활성</option>
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
  )
}

export default SchedulePolicyForm

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
};