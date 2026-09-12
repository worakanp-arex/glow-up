import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ChevronDown, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as authService from "../../services/authService.js";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.jsx";
import "./Register.css";

const DASHBOARD_BY_ROLE = {
  user: "/dashboard",
  employer: "/employer/dashboard",
};

const INITIAL_FORM = {
  role: "user",
  name: "",
  email: "",
  password: "",
  phone: "",
  education: "",
  experience: "",
  companyName: "",
  businessType: "",
  taxId: "",
  pdpaConsent: false,
};

const RESEND_COOLDOWN_SECONDS = 60;

function buildPayload(form, avatarFile) {
  if (!avatarFile) return form;
  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => formData.append(key, value));
  formData.append("avatar", avatarFile);
  return formData;
}

function Register() {
  const { completeRegistration, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [form, setForm] = useState(INITIAL_FORM);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRoleChange(role) {
    setForm((prev) => ({ ...prev, role }));
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleGoogleCredential(credential) {
    setError("");
    if (!form.pdpaConsent) {
      setError("กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิกด้วย Google");
      return;
    }
    setSubmitting(true);
    try {
      const user = await loginWithGoogle(credential, form.role, form.pdpaConsent);
      navigate(DASHBOARD_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestOtp() {
    setError("");
    setDevOtp("");
    setSubmitting(true);
    try {
      const result = await authService.requestRegistrationOtp(buildPayload(form, avatarFile));
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (result.devOtp) setDevOtp(result.devOtp);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งรหัส OTP ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    if (!form.pdpaConsent) {
      setError("กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก");
      return;
    }
    await requestOtp();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    await requestOtp();
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await completeRegistration({ email: form.email, otp });
      navigate(DASHBOARD_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.message || "ยืนยัน OTP ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="register-page">
        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-blob auth-visual-blob-1" />
          <div className="auth-visual-blob auth-visual-blob-2" />
          <div className="auth-visual-content">
            <span className="auth-visual-brand">glow-up</span>
            <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
            <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
          </div>
        </div>

        <form className="register-form" onSubmit={handleVerifyOtp}>
          <h1>
            <ShieldCheck size={22} />
            <span>ยืนยันอีเมล</span>
          </h1>
          <p className="register-otp-hint">
            กรอกรหัส 6 หลักที่ส่งไปยัง <strong>{form.email}</strong>
          </p>

          {devOtp && (
            <p className="register-otp-dev">โหมดทดสอบ (ยังไม่ได้ตั้งค่าอีเมลจริง): รหัส OTP คือ {devOtp}</p>
          )}

          {error && <p className="register-error">{error}</p>}

          <label>
            รหัส OTP
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting || otp.length !== 6}>
            {submitting ? "กำลังยืนยัน..." : "ยืนยันและสมัครสมาชิก"}
          </button>

          <button type="button" className="register-otp-resend" onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? `ส่งรหัสอีกครั้งได้ใน ${cooldown} วินาที` : "ส่งรหัส OTP อีกครั้ง"}
          </button>

          <button type="button" className="register-otp-back" onClick={() => setStep("details")}>
            &larr; แก้ไขข้อมูล
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-visual-blob auth-visual-blob-1" />
        <div className="auth-visual-blob auth-visual-blob-2" />
        <div className="auth-visual-content">
          <span className="auth-visual-brand">glow-up</span>
          <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
          <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
        </div>
      </div>

      <form className="register-form" onSubmit={handleDetailsSubmit}>
        <h1>
          <UserPlus size={22} />
          <span>สมัครสมาชิก</span>
        </h1>

        {error && <p className="register-error">{error}</p>}

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && <>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
          <div className="auth-divider">หรือ</div>
        </>}

        <div className="register-avatar-picker">
          <button
            type="button"
            className="register-avatar-button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="เลือกรูปโปรไฟล์"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="ตัวอย่างรูปโปรไฟล์" />
            ) : (
              <Camera size={22} />
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarChange}
            hidden
          />
          <span className="register-avatar-hint">รูปโปรไฟล์ (ไม่บังคับ)</span>
        </div>

        <div className="register-role-toggle" role="radiogroup" aria-label="ประเภทผู้ใช้งาน">
          <button
            type="button"
            role="radio"
            aria-checked={form.role === "user"}
            className={form.role === "user" ? "active" : ""}
            onClick={() => handleRoleChange("user")}
          >
            ผู้หางาน
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={form.role === "employer"}
            className={form.role === "employer" ? "active" : ""}
            onClick={() => handleRoleChange("employer")}
          >
            นายจ้าง
          </button>
        </div>

        <div className="register-field-row">
          <label>
            {form.role === "employer" ? "ชื่อผู้ติดต่อ" : "ชื่อ-นามสกุล"}
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            เบอร์โทรศัพท์
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
          </label>
        </div>
        <label>
          อีเมล
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          รหัสผ่าน
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />
        </label>

        {form.role === "user" && (
          <div className="register-field-row">
            <label>
              ระดับการศึกษา
              <input type="text" name="education" value={form.education} onChange={handleChange} />
            </label>
            <label>
              ประสบการณ์ทำงาน
              <input type="text" name="experience" value={form.experience} onChange={handleChange} />
            </label>
          </div>
        )}

        {form.role === "employer" && (
          <>
            <div className="register-field-row">
              <label>
                ชื่อบริษัท
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                ประเภทธุรกิจ
                <input type="text" name="businessType" value={form.businessType} onChange={handleChange} />
              </label>
            </div>
            <label>
              เลขประจำตัวผู้เสียภาษี
              <input type="text" name="taxId" value={form.taxId} onChange={handleChange} required />
            </label>
          </>
        )}

        <div className="register-consent">
          <label className="register-consent-checkbox">
            <input
              type="checkbox"
              checked={form.pdpaConsent}
              onChange={(e) => setForm((prev) => ({ ...prev, pdpaConsent: e.target.checked }))}
              required
            />
            <span>
              ฉันยอมรับ<button
                type="button"
                className="register-consent-toggle"
                onClick={() => setConsentExpanded((v) => !v)}
              >
                นโยบายความเป็นส่วนตัวและการเก็บข้อมูล (PDPA)
                <ChevronDown size={14} className={consentExpanded ? "open" : ""} />
              </button>
            </span>
          </label>
          {consentExpanded && (
            <div className="register-consent-details">
              <p>glow-up เก็บข้อมูลเท่าที่จำเป็นสำหรับการให้บริการเท่านั้น ได้แก่ ข้อมูลบัญชีผู้ใช้ (ชื่อ อีเมล เบอร์โทร) และข้อมูลที่ท่านกรอกเพิ่มเติมตามบทบาทการใช้งาน เช่น ข้อมูลการสมัครงานหรือข้อมูลบริษัท</p>
              <p>ข้อมูลด้านสุขภาพและการฟื้นฟู (เช่น บันทึกอารมณ์ ระดับความเสี่ยง) จะถูกเก็บแยกจากข้อมูลทั่วไป เข้าถึงได้เฉพาะตัวท่านและบุคลากรที่เกี่ยวข้อง และจะไม่เปิดเผยต่อบุคคลที่สาม รวมถึงนายจ้าง โดยไม่ได้รับความยินยอมจากท่านก่อน</p>
              <p>ท่านสามารถขอเข้าถึง แก้ไข หรือขอให้ลบข้อมูลของท่านได้ตลอดเวลาผ่านหน้าโปรไฟล์ หรือติดต่อผู้ดูแลระบบ</p>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting || !form.pdpaConsent}>
          {submitting ? "กำลังส่งรหัส OTP..." : "ขอรหัส OTP เพื่อสมัครสมาชิก"}
        </button>

        <p className="register-switch">
          มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
