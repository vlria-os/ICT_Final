import { createSlice } from "@reduxjs/toolkit";

const initialState={
    userId:sessionStorage.getItem("userId") ? Number(sessionStorage.getItem("userId")) : null,
    email:sessionStorage.getItem("email") ? sessionStorage.getItem("email") : null,
    name:sessionStorage.getItem("name") ? sessionStorage.getItem("name") : null,
    accessToken:sessionStorage.getItem("accessToken") ? sessionStorage.getItem("accessToken") : null,
    roles: sessionStorage.getItem("roles") ? JSON.parse(sessionStorage.getItem("roles")) : [],
    status:sessionStorage.getItem("status") ? sessionStorage.getItem("status") : null,
    departmentId:sessionStorage.getItem("departmentId") ? Number(sessionStorage.getItem("departmentId")) : null
};

const authSlice=createSlice({
    name:"auth",
    initialState,
    reducers:{
        loginSuccess:(state, action)=>{
            const { userId, email, accessToken, roles, status, departmentId, name }=action.payload;

            state.userId=userId;
            state.email=email;
            state.name=name;
            state.accessToken=accessToken;
            state.roles=roles;
            state.status=status;
            state.departmentId=departmentId ? departmentId : null;

            sessionStorage.setItem("userId", String(userId));
            sessionStorage.setItem("email", email);
            sessionStorage.setItem("name", name);
            sessionStorage.setItem("accessToken", accessToken);
            sessionStorage.setItem("roles", JSON.stringify(roles));
            sessionStorage.setItem("status", status);
            sessionStorage.setItem("departmentId", departmentId != null ? String(departmentId) : null);
        },
        updateToken: (state, action) => {
            const { accessToken } = action.payload;

            state.accessToken = accessToken;
            sessionStorage.setItem("accessToken", accessToken);
        },
        logout:(state)=>{
            state.userId=null;
            state.email=null;
            state.name=null;
            state.accessToken=null;
            state.roles=[];
            state.status=null;
            state.departmentId=null;

            sessionStorage.removeItem("userId");
            sessionStorage.removeItem("email");
            sessionStorage.removeItem("name");
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("roles");
            sessionStorage.removeItem("status");
            sessionStorage.removeItem("departmentId");
        }
    }
});

export const { loginSuccess, logout, updateToken } = authSlice.actions;
export default authSlice.reducer;