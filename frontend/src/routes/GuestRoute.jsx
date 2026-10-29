import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleHome } from "../constants/roleHome.js";
import { inviteReturnTo } from "../utils/authNavigation.js";

// หน้าสำหรับผู้ที่ยังไม่ล็อกอิน (เข้าสู่ระบบ สมัครสมาชิก) ผู้ที่ล็อกอินอยู่แล้ว
// จะถูกส่งต่อ แทนที่จะเห็นฟอร์มที่เงียบๆ สลับบัญชี
// ที่อยู่หลังการแจ้งเตือนที่เปิดอยู่
function GuestRoute() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  if (!isAuthenticated) return <Outlet />;
  const returnTo = ["family", "user"].includes(user.role) ? inviteReturnTo(searchParams) : null;
  return <Navigate to={returnTo || roleHome(user.role)} replace />;
}

export default GuestRoute;
