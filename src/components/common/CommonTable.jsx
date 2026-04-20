import React from 'react'
// 공통테이블 규칙
// | 의미  | 추천 key    |
// | --- | --------- |
// | 이름  | name      |
// | 연락처 | phone     |
// | 상태  | status    |
// | 날짜  | createdAt |
// | ID  | id        |

// 예 )
// const mappedData = apiData.map(item => ({
//   id: item.patient_id,
//   name: item.name,
//   phone: item.phone
// }));

const CommonTable = ({columns=[], data=[]}) => {
  return (
    <div style={styles.wrapper}>
        <table style={styles.table}>
            <thead>
                <tr>{columns.map((column)=>(
                    <th key={column.key} style={styles.th}>
                        {column.title}
                    </th>
                ))}
                </tr>
            </thead>

            <tbody>
                {data.length >0?(
                    data.map((item, index)=>(
                        <tr key={item.id || index}>
                            {columns.map((column)=>(
                                <td key={column.key} style={styles.td}>
                                    {item[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length}>
                            데이터가 없습니다.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
  );
};

export default CommonTable

const styles = {
    wrapper:{
        width:"100%",
        overflowX:"auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    border: "1px solid #ddd",
    padding: "8px",
    backgroundColor: "#f5f5f5",
  },
  td: {
    border: "1px solid #eee",
    padding: "8px",
  },
}