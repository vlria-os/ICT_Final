import jwtAxios from "../jwtAxios";

const host = "http://localhost:8080/api/schedule-policy";

export const getDepartmentSchedulePolicyList = async () => {
  const res = await jwtAxios.get(`${host}/list`);
  return res.data;
};

export const getDepartmentSchedulePolicy = async (departmentId) => {
  const res = await jwtAxios.get(`${host}/${departmentId}`);
  return res.data;
};

export const registerDepartmentSchedulePolicy = async (data) => {
  const res = await jwtAxios.post(`${host}`, data);
  return res.data;
};

export const updateDepartmentSchedulePolicy = async (departmentId, data) => {
  const res = await jwtAxios.put(`${host}/${departmentId}`, data);
  return res.data;
};

// 비활성화 (softDelete: isActive=false)
export const deactivateDepartmentSchedulePolicy = async (departmentId) => {
  const res = await jwtAxios.delete(`${host}/${departmentId}`);
  return res.data;
};
