import jwtAxios from "../jwtAxios";

const host="http://localhost:8080/api/schedule_type";

export const getSchedulePolicyList=async()=>{
    const res=await jwtAxios.get(`${host}/list`);
    return res.data;
};

export const getSchedulePolicy = async(scheduleTypeId)=>{
    const res=await jwtAxios.get(`${host}/${scheduleTypeId}`);
    return res.data;
};

export const registerSchedulePolicy = async(schedulePolicyData)=>{
    const res = await jwtAxios.post(`${host}/register`, schedulePolicyData);
    return res.data;
};

export const updateSchedulePolicy = async(scheduleTypeId, schedulePolicyData)=>{
    const res = await jwtAxios.put(`${host}/${scheduleTypeId}`, schedulePolicyData);
    return res.data;
};
