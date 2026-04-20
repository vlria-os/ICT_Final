import jwtAxios from "../jwtAxios";

const host = "http://localhost:8080/api/staff";

export const getStaffList = async() => {
    const res = await jwtAxios.get(`${host}/list?size=1000`);
    return res.data?.content ?? res.data;
};

export const getStaffOne = async(staffId) => {
    const res = await jwtAxios.get(`${host}/${staffId}`);
    return res.data;
};

export const registerStaff = async(staffData) => {
    const res = await jwtAxios.post(`${host}/register`, staffData);
    return res.data;
};

export const updateStaff = async (staffData) =>{
    const res = await jwtAxios.put(`${host}/update`, staffData);
    return res.data;
};
export const deleteStaff = async(staffId) => {
    const res= await jwtAxios.delete(`${host}/${staffId}`);
    return res.data;
};