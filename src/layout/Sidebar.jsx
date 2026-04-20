import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Sidebar = () => {
  const token = sessionStorage.getItem("accessToken");

  let roles = [];

  if (token) {
   try {
   
      const decoded = jwtDecode(token);

      roles = decoded.roles || [];
      console.log("user roles:", roles);
    } catch (e) {
      console.error("토큰 디코딩 실패", e);
    }
  }

  const hasAccess = (itemRoles) => {
    if (!itemRoles) return true; // roles 없으면 누구나 접근 가능
    return itemRoles.some((role) => roles.includes(role));
  };

  const DOCTORS = ["INTERN", "RESIDENT", "FELLOW", "SPECIALIST", "PROFESSOR", "HEAD_DOCTOR"];
  const NURSES = ["NURSE", "CHARGE_NURSE", "HEAD_NURSE", "DIRECTOR_NURSE"];
  const ADMIN_STAFF = ["STAFF","MANAGER", "ADMIN"];

  const MEDICAL_ROLES = ["DOCTOR", ...DOCTORS, "NURSE", ...NURSES];

  const menuItems = [
    { path: "/my-schedule", label: "내 스케줄", roles: MEDICAL_ROLES },
    { path: "/communication", label: "공지사항" },

    { path: "/reservation", label: "예약", roles: [...DOCTORS, "PATIENT", ...NURSES, ...ADMIN_STAFF] },
    { path: "/medical", label: "진료 관리", roles: [...DOCTORS] },
    { path: "/reservationconfirm", label: "예약 확인", roles: [...DOCTORS, ...NURSES, ...ADMIN_STAFF] },
    { path: "/reception", label: "접수", roles: [...DOCTORS, ...ADMIN_STAFF] },
    { path: "/billing", label: "수납", roles: [...ADMIN_STAFF] },

    {
      label: "인사관리",
      children: [
        { path: "/staff", label: "직원관리", roles: [...ADMIN_STAFF] },
        { path: "/department", label: "부서관리", roles: [...ADMIN_STAFF] },
        { path: "/staff_schedule", label: "근무스케줄 관리", roles: ["HEAD_NURSE", "PROFESSOR", "ADMIN","MANAGER"] },
        { path: "/surgery", label: "수술 스케줄 관리", roles: ["HEAD_NURSE", "PROFESSOR"] },
      ],
    },
    {
      label: "운영관리",
      children: [
        { path: "/operation/schedule_policy", label: "스케줄 운영설정", roles: ["ADMIN"] },
        { path: "/operation/dept_schedule_policy", label: "부서별 스케줄 정책", roles: ["ADMIN"] },
      ],
    },
    {
      label: "관리자",
      children: [
        { path: "/admin/account", label: "계정 / 권한 관리", roles: ["ADMIN"] },
        { path: "/admin/log", label: "로그 관리", roles: ["ADMIN"] },
      ],
    },
    { path: "/chat", label: "채팅", roles: ["ADMIN","DOCTOR","NURSE","MANAGER","STAFF"] },
    { path: "/inquiry/chatbot", label: "AI 문의하기"},
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">메뉴</div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {

          if (!hasAccess(item.roles)) return null;
          if (item.children) {
              const filteredChildren = item.children.filter(child =>
                hasAccess(child.roles)
              );
              if (filteredChildren.length === 0) return null;

            return (
              <div key={item.label} className="sidebar-group">

                <div className="sidebar-link sidebar-group-title">
                  {item.label}
                </div>

                <div className="sidebar-submenu">
                  {filteredChildren.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        isActive
                          ? "sidebar-sublink active"
                          : "sidebar-sublink"
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }


          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
