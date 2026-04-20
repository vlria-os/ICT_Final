import React, { useState } from 'react'
import SearchBar from '../../components/common/SearchBar'
import CommonTable from '../../components/common/CommonTable'
import RegisterButton from '../../components/common/RegisterButton'
import CommonModal from '../../components/common/CommonModal'


// 공통기능 예시로 테스트 해본 것 해당 페이지에 맞게 구현하면 됨
const PatientPage = () => {
    const [open,setOpen] = useState(false);

    const handleOpen=()=>setOpen(true);
    const handleClose=()=>setOpen(false);
  return (
    <div>
        <div>환자관리 페이지</div>
        <SearchBar/>
        <RegisterButton onClick={handleOpen}/>
        <CommonTable />
        <CommonModal open={open} onClose={handleClose}>
            내용<br/>
            <button onClick={handleClose}>저장</button>
        </CommonModal>
        <p>환자 등록 및 정보관리</p>
    </div>
  )
}

export default PatientPage