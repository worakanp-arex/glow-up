import PageHeader from "../../components/common/PageHeader.jsx";
import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import * as authService from "../../services/authService.js";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevResetUrl("");
    setSubmitting(true);
    try {
      const result = await authService.forgotPassword(email);
      setMessage(result.message);
      if (result.devResetUrl) setDevResetUrl(result.devResetUrl);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-visual-blob auth-visual-blob-1" />
        <div className="auth-visual-blob auth-visual-blob-2" />
        <div className="auth-visual-content">
          <span className="auth-visual-brand">glow-up</span>
          <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
          <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <PageHeader icon={KeyRound} backTo="/login" backLabel="หน้าเข้าสู่ระบบ" description={<>กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้</>}>ลืมรหัสผ่าน</PageHeader>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}
        {devResetUrl && (
          <p className="login-dev-note">
            โหมดทดสอบ:{" "}
            <a href={devResetUrl} target="_blank" rel="noreferrer">
              เปิดลิงก์รีเซ็ตรหัสผ่าน
            </a>
          </p>
        )}

        <label>
          อีเมล
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "กำลังส่งคำขอ..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
        </button>

        <p className="login-switch">
          นึกรหัสผ่านได้แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPassword;
