import React, { useEffect, useState } from 'react'
const initState={
    departmentId:"",
    departmentName:"",
    departmentCategory:"",
    location:"",
    status:"",
};

const DepartmentForm = ({onSubmit, onClose, initialData}) => {
    const[form, setForm] = useState(initState);

    useEffect(()=>{
        if(initialData) {
            setForm({
                departmentId:initialData.departmentId ||"",
                departmentName:initialData.departmentName || "",
                departmentCategory:initialData.departmentCategory || "",
                location: initialData.location || "",
                status: initialData.status || "",
            });
        }else{
            setForm(initState);
        }
    },[initialData]);

    const handleChange = (e) => {
        const {name, value} = e.target;

        setForm({
            ...form,
            [name]:value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const requestData = {
            departmentId: form.departmentId? Number(form.departmentId) : null,
            departmentName: form.departmentName,
            departmentCategory: form.departmentCategory,
            location : form.location,
            status: form.status 
        }
        onSubmit(requestData);
        setForm(initState);
    };
    
  return (
    <form onSubmit={handleSubmit}>
        <h3>부서등록</h3>
        <div style={styles.formGrid}>
            <div>
                <label>부서명</label>
                <input
                type="text"
                name='departmentName'
                placeholder='부서명'
                value={form.departmentName}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>카테고리</label>
                    <select 
                    name="departmentCategory"
                    value={form.departmentCategory}
                    onChange={handleChange}
                    >
                    <option value="">카테고리 선택</option>
                    <option value="DOCTOR">의료부서</option>
                    <option value="NURSE">간호부서</option>
                    <option value="ADMIN">행정부서</option>
                    </select>
            </div>

            <div>
                <label>위치</label>
                <input
                type="text"
                name='location'
                placeholder='부서위치'
                value={form.location}
                onChange={handleChange}
                />
            </div>

            <div>
                <label>상태</label>
                <select
                name='status'
                value={form.status}
                onChange={handleChange}
                >
                <option value="Y">사용</option>
                <option value="N">비활성</option>
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

export default DepartmentForm;

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

