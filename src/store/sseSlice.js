import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  doctorId: null
};

const slice = createSlice({
  name: "doctor",
  initialState,
  reducers: {
    setDoctorId: (state, action) => {
      state.doctorId = action.payload;
    }
  }
});

export const { setDoctorId } = slice.actions;
export default slice.reducer;