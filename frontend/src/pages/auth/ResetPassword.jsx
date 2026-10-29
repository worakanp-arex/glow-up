import PageHeader from "../../components/common/PageHeader.jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import * as authService from "../../services/authService.js";
import "./Login.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  // อ่านความลับของลิงก์ครั้งเดียวแล้วนำออกจากแถบที่อยู่ เพื่อไม่ให้
  // ค้างในประวัติเบราว์เซอร์ ภาพหน้าจอ หรือหน้าจอที่แชร์ ลิงก์ใช้ได้
  // ครั้งเดียวอยู่แล้ว การโหลดใหม่จะขอลิงก์ใหม่
  const [{ token, email }] = useState(() => ({
    token: searchParams.get("token") || "",
    email: searchParams.get("email") || "",
  }));
  useEffect(() => {
    if (location.search) navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword({ email, token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="login-page">
        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-blob auth-visual-blob-1" />
          <div className="auth-visual-blob auth-visual-blob-2" />
          <div className="auth-visual-content">
            <span className="auth-visual-brand">Grow Up</span>
            <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
            <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
          </div>
        </div>

        <div className="login-form">
          <PageHeader icon={KeyRound} backTo="/login" backLabel="หน้าเข้าสู่ระบบ" description={<>
            ลิงก์รีเซ็ตรหัสผ่านไม่สมบูรณ์ กรุณาขอลิงก์ใหม่อีกครั้ง
          </>}>ลิงก์ไม่ถูกต้อง</PageHeader>
          <Link to="/forgot-password" className="login-switch">
            ขอลิงก์รีเซ็ตรหัสผ่านใหม่
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-visual-blob auth-visual-blob-1" />
        <div className="auth-visual-blob auth-visual-blob-2" />
        <div className="auth-visual-content">
          <span className="auth-visual-brand">Grow Up</span>
          <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
          <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <PageHeader icon={KeyRound} backTo="/login" backLabel="หน้าเข้าสู่ระบบ">ตั้งรหัสผ่านใหม่</PageHeader>

        {error && <p className="login-error">{error}</p>}
        {done && <p className="login-success">ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังพาไปหน้าเข้าสู่ระบบ...</p>}

        <label>
          รหัสผ่านใหม่
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={10}
            maxLength={128}
            required
            disabled={done}
          />
        </label>
        <label>
          ยืนยันรหัสผ่านใหม่
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={10}
            maxLength={128}
            required
            disabled={done}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting || done}>
          {submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
