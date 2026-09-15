import { inviteReturnTo } from "../../utils/authNavigation.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.jsx";
import "./Login.css";

const DASHBOARD_BY_ROLE = {
  user: "/dashboard",
  family: "/family/dashboard",
  employer: "/employer/dashboard",
  admin: "/admin",
};

function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = inviteReturnTo(searchParams);
  const [form, setForm] = useState({ email: searchParams.get("email") || "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      navigate((["family", "user"].includes(user.role) && returnTo) || DASHBOARD_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setError("");
    setSubmitting(true);
    try {
      const user = await loginWithGoogle(credential);
      navigate((["family", "user"].includes(user.role) && returnTo) || DASHBOARD_BY_ROLE[user.role] || "/");
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.message?.includes("นโยบายความเป็นส่วนตัว")) {
        setError("บัญชี Google นี้ยังไม่เคยสมัครสมาชิก กรุณาไปที่หน้าสมัครสมาชิกเพื่อยอมรับนโยบายความเป็นส่วนตัวก่อน");
      } else {
        setError(err.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      }
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
        <PageHeader icon={LogIn}>เข้าสู่ระบบ</PageHeader>

        {error && <p className="login-error">{error}</p>}

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && <>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
          <div className="auth-divider">หรือ</div>
        </>}

        <label>
          อีเมล
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </label>

        <Link to="/forgot-password" className="login-forgot-link">
          ลืมรหัสผ่าน?
        </Link>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <p className="login-switch">
          ยังไม่มีบัญชี? <Link to={`/register?${searchParams.toString()}`}>สมัครสมาชิก</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
