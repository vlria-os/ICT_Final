import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./layout.css";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SseProvider from "../components/common/SseProvider";

const MainLayout = () => {
  const userId = useSelector(state => state.auth.userId);
  
  const handleSse = (data) => {
      toast(
        <div style={{ whiteSpace: "pre-line" }}>
          🩺 새 예약
          {"\n"}예약 번호: {data.reservationId}
          {"\n"}환자: {data.patientName}
          {"\n"}날짜: {data.reservationDate}
        </div>
      );
  };

  return (
    <div className="layout-container">
      <SseProvider userId={userId} onMessage={handleSse} />
      <Sidebar />
      <div className="layout-main">
        <Header />

        <main className="layout-content">
          <Outlet />
        </main>
      </div>

      {/* Toast 렌더링 */}
        <ToastContainer 
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />

    </div>
  );
};

export default MainLayout;