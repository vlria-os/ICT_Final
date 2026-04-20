import React, { useRef, useState } from 'react'
import jwtAxios from '../../api/jwtAxios';
import * as XLSX from 'xlsx';
import CommonModal from '../common/CommonModal';
import './StaffBulkUpload.css';


//프론트 유효성 검사
function validateRow(row) {
  const errors = [];
  if(!row.user_id) errors.push("사용자 아이디 누락");
  if(!row.name) errors.push("이름 누락");
  if(!row.dept_name) errors.push("부서명 누락");
  if(!row.position) errors.push("직무(직급) 누락");
  if(!["Y", "N"].includes((row.is_active||"").toUpperCase())){
    errors.push("활성여부 Y 또는 N");
}
return errors;
}

const StaffBulkUpload = ({open, onClose, onSuccess}) => {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  //엑셀 파싱
  const parseExcel = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload=(e)=> {
      const wb = XLSX.read(e.target.result,{type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, {defval:""});

      const mapped = data.map((raw)=>{
        const row ={
          user_id : String(raw["user_id"] || "").trim(),
          name : String(raw["이름"] || "").trim(),
          dept_name : String(raw["부서명"] || "").trim(),
          position : String(raw["직무(직급)"] || "").trim(),
          phone : String(raw["전화번호"] || "").trim(),
          address : String(raw["주소"] || "").trim(),
          manager_id : String(raw["담당자 user_id"] || "").trim() || null,
          is_active : String(raw["활성여부(Y/N)"] || "").trim().toUpperCase(),
        };
        row._errors = validateRow(row);
        return row;
      });
      setRows(mapped);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if(file) parseExcel(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if(file) parseExcel(file);
  };

  //템플릿 다운로드
  const downloadTemplete = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["user_id","이름","부서명","직무(직급)","전화번호","주소","담당자 user_id","활성여부(Y/N)"],
      ["dr_sample","홍길동","내과","전문의","010-0000-0000","서울시 강남구","","Y" ],
    ]);
    ws["!cols"] = [14,10,10,12,14,20,14,12].map((w) => ({wch:w}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"직원등록");
    XLSX.writeFile(wb,"직원_일괄등록_템플릿.xlsx");
  };

  //서버등록요청
  const handleSubmit = async() => {
    setLoading(true);
    try{
      const validRows = rows.filter((r)=> r._errors.length === 0)
      .map(({_errors, ...rest})=> rest);

      const res = await jwtAxios.post("/api/staff/bulk-upload", validRows);
      setResult(res.data);
      setStep("result");

      //등록 완료 후 직원 목록 새로고침
      if (onSuccess) onSuccess();
    }catch(err){
      alert("등록 중 오류가 발생했습니다")
    }finally{
      setLoading(false);
    }
  };

  //모달 닫을 때 상태 초기화
  const handleClose = () => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setResult(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const errorCount = rows.filter((r)=>r._errors.length > 0).length;
  const okCount = rows.length - errorCount;

  return (
    <CommonModal open={open} onClose={handleClose}>
    <div className='bulk-upload'>
      <div className='bulk-upload_header'>
        <h2 className='bulk-upload_title'>
          {step == "upload" && "직원 일괄등록"}
          {step == "preview" && "미리보기"}
          {step == "result" && "등록 완료"}
        </h2>
        <button className='bulk-upload_close' onClick={handleClose}>X</button>
      </div>

      {/* 업로드 */}
      {step == "upload" && (
        <div className='bulk-upload_body'>
          <div
          className={`bulk-upload__dropzone${dragging ? " bulk-upload__dropzone--dragging" : ""}`}
          onDragOver={(e) => {e.preventDefault(); setDragging(true);}}
          onDragLeave={()=> setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}>
            <span className="bulk-upload__dropzone-icon">📂</span>
            <p>엑셀 파일을 클릭하거나 드래그하여 업로드</p>
            <span className='bulk-upload_dropzone-sub'>.xslx, xls지원</span>
          </div>
          
          <input
          ref={fileInputRef}
          type='file'
          accept='.xlsx,.xls'
          style={{display:"none"}}
          onChange={handleFileChange}/>
          
          <button className="btn btn--outline" onClick={downloadTemplete}>
            📥 템플릿 다운로드
           </button>
           </div>
      )}

      {/* 미리보기 */}
      {step == "preview" && (
        <div className="bulk-upload__body">
            <p className="bulk-upload__filename">{fileName}</p>

             {/* 통계 */}
            <div className="bulk-upload__stats">
              <div className="stat-card">
                <span className="stat-card__label">전체</span>
                <span className="stat-card__value">{rows.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">정상</span>
                <span className="stat-card__value stat-card__value--green">{okCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">오류</span>
                <span className="stat-card__value stat-card__value--red">{errorCount}</span>
              </div>
            </div>

            {/* 오류 경고 */}
            {errorCount > 0 && (
              <div className="bulk-upload__warning">
                ⚠️ {errorCount}개 행에 오류가 있습니다. 오류 행은 제외하고 등록됩니다.
              </div>
            )}
             {/* 테이블 */}
            <div className="bulk-upload__table-wrap">
              <table className="bulk-upload__table">
                <thead>
                  <tr>
                    <th>행</th>
                    <th>user_id</th>
                    <th>이름</th>
                    <th>부서명</th>
                    <th>직무/직급</th>
                    <th>전화번호</th>
                    <th>주소</th>
                    <th>담당자 user_id</th>
                    <th>활성여부</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={row._errors.length > 0 ? "row--error" : ""}
                      title={row._errors.join(", ")}
                    >
                      <td>{i + 1}</td>
                      <td>{row.user_id    || "-"}</td>
                      <td>{row.name       || "-"}</td>
                      <td>{row.dept_name  || "-"}</td>
                      <td>{row.position   || "-"}</td>
                      <td>{row.phone      || "-"}</td>
                      <td className="td--ellipsis">{row.address || "-"}</td>
                      <td>{row.manager_id || "-"}</td>
                      <td>
                        <span className={`badge ${row.is_active === "Y" ? "badge--green" : "badge--red"}`}>
                          {row.is_active === "Y" ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td>
                        {row._errors.length > 0 ? (
                          <span className="badge badge--amber" title={row._errors.join(", ")}>오류</span>
                        ) : (
                          <span className="badge badge--green">정상</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              
            <div className="bulk-upload__footer">
            <button className="btn btn--outline" onClick={() => setStep("upload")}>
              다시 선택
            </button>
              <button
               className="btn btn--primary"
               onClick={handleSubmit}
               disabled={loading || okCount === 0}
              >
                {loading ? "등록 중..." : `${okCount}건 등록하기`}
              </button>
            </div>
          </div>
        )}
        {/* ── STEP 3: 결과 ── */}
        {step === "result" && result && (
          <div className="bulk-upload__body">
            <div className="bulk-upload__stats">
              <div className="stat-card">
                <span className="stat-card__label">전체</span>
                <span className="stat-card__value">{result.successCount + result.failCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">성공</span>
                <span className="stat-card__value stat-card__value--green">{result.successCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">실패</span>
                <span className="stat-card__value stat-card__value--red">{result.failCount}</span>
              </div>
            </div>

            {result.failCount > 0 && (
              <>
                <p className="bulk-upload__section-label">실패 목록</p>
                <div className="bulk-upload__table-wrap">
                  <table className="bulk-upload__table">
                    <thead>
                      <tr>
                        <th>행</th>
                        <th>user_id</th>
                        <th>이름</th>
                        <th>사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failDetails.map((f, i) => (
                        <tr key={i}>
                          <td>{f.row}</td>
                          <td>{f.user_id}</td>
                          <td>{f.name}</td>
                          <td className="td--error">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="bulk-upload__footer">
              <button className="btn btn--primary" onClick={handleClose}>닫기</button>
            </div>
          </div>
        )}

      </div>
    </CommonModal>
  );
};

export default StaffBulkUpload;