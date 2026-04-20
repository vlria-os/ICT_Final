import jwtAxios from "./jwtAxios";

const host = "http://localhost:8080/api/surgery";

export const getSurgeryList = async () => {
  const res = await jwtAxios.get(host);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

export const registerSurgery = async (data) => {
  const res = await jwtAxios.post(host, data);
  return res.data?.content;
};

export const registerEmergencySurgery = async (data) => {
  const res = await jwtAxios.post(`${host}/emergency`, data);
  return res.data?.content;
};

export const updateSurgery = async (data) => {
  const res = await jwtAxios.put(host, data);
  return res.data?.content;
};

export const cancelSurgery = async (surgeryId) => {
  const res = await jwtAxios.delete(`${host}/${surgeryId}`);
  return res.data;
};
