import { inviteReturnTo } from "../../utils/authNavigation.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Camera, ChevronDown, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as authService from "../../services/authService.js";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.jsx";
import { roleHome } from "../../constants/roleHome.js";
import { shrinkImage, AVATAR_MAX_BYTES } from "../../utils/shrinkImage.js";
import "./Register.css";

const ROLE_OPTIONS = [
  { value: "user", label: "ผู้ใช้งานปกติ" },
  { value: "employer", label: "นายจ้าง" },
  { value: "family", label: "ครอบครัว/ผู้ดูแล" },
];

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

// เซิร์ฟเวอร์ส่งความลับนี้ให้เฉพาะเบราว์เซอร์ที่เริ่มการสมัคร
// มันคือสิ่งที่ทำให้คนเดิมขอรหัสใหม่หรือยืนยันให้เสร็จได้ และ
// ป้องกันไม่ให้คนอื่นที่รู้อีเมลเข้ามาแทรกแซง เก็บไว้เฉพาะแท็บนี้
// เพื่อให้การโหลดหน้าใหม่กลางทางไม่ล็อกผู้ใช้ออกจากการสมัคร
const REGISTRATION_TOKEN_KEY = "registrationToken";

function readRegistrationToken() {
  try {
    return window.sessionStorage.getItem(REGISTRATION_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function storeRegistrationToken(token) {
  try {
    if (token) window.sessionStorage.setItem(REGISTRATION_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
  } catch {
    // โหมดส่วนตัว: token ยังอยู่ใน state ของคอมโพเนนต์สำหรับการเข้าชมครั้งนี้
  }
}

function buildPayload(form, avatarFile, registrationToken) {
  const fields = registrationToken ? { ...form, registrationToken } : form;
  if (!avatarFile) return fields;
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("avatar", avatarFile);
  return formData;
}

function Register() {
  const { completeRegistration, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = inviteReturnTo(searchParams);
  const [step, setStep] = useState("details");
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, role: searchParams.get("role") === "family" ? "family" : "user", email: searchParams.get("email") || "" }));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(readRegistrationToken);
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

  async function handleAvatarChange(e) {
    const picked = e.target.files[0];
    e.target.value = "";
    if (!picked) return;
    const file = await shrinkImage(picked);
    if (file.size > AVATAR_MAX_BYTES) {
      setError("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB กรุณาเลือกรูปอื่น");
      return;
    }
    setError("");
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
      navigate((["family", "user"].includes(user.role) && returnTo) || roleHome(user.role));
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestOtp() {
    setError("");
    setSubmitting(true);
    try {
      const data = await authService.requestRegistrationOtp(buildPayload(form, avatarFile, registrationToken));
      setRegistrationToken(data.registrationToken);
      storeRegistrationToken(data.registrationToken);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
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
      const user = await completeRegistration({ email: form.email, otp, registrationToken });
      storeRegistrationToken("");
      navigate((["family", "user"].includes(user.role) && returnTo) || roleHome(user.role));
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
            <span className="auth-visual-brand">Grow Up</span>
            <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
            <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
          </div>
        </div>

        <form className="register-form" onSubmit={handleVerifyOtp}>
          <PageHeader icon={ShieldCheck} onBack={() => setStep("details")} backLabel="ข้อมูลสมัครสมาชิก" description={<>
            กรอกรหัส 6 หลักที่ส่งไปยัง <strong>{form.email}</strong>
          </>}>ยืนยันอีเมล</PageHeader>

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

          <p className="register-otp-note">
            หากไม่ได้รับรหัส อีเมลนี้อาจมีบัญชีอยู่แล้ว ลอง<Link to="/login">เข้าสู่ระบบ</Link>หรือ<Link to="/forgot-password">ตั้งรหัสผ่านใหม่</Link>
          </p>

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
          <span className="auth-visual-brand">Grow Up</span>
          <h2>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h2>
          <p>พื้นที่ปลอดภัยสำหรับผู้ผ่านการบำบัด เชื่อมโอกาสการทำงานจริง ด้วยความเข้าใจและความเป็นส่วนตัว</p>
        </div>
      </div>

      <form className="register-form" onSubmit={handleDetailsSubmit}>
        <PageHeader icon={UserPlus}>สมัครสมาชิก</PageHeader>

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
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={form.role === option.value}
              className={form.role === option.value ? "active" : ""}
              onClick={() => handleRoleChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {form.role === "family" && <p className="register-family-note">สมัครสมาชิกได้ทันที เมื่อเข้าสู่ระบบแล้วกรอกอีเมลของคนที่คุณห่วงใยเพื่อขอเชื่อมต่อ เจ้าของข้อมูลจะเป็นผู้อนุมัติก่อนที่คุณจะเห็นความคืบหน้า หรือจะเปิดลิงก์คำเชิญที่ส่งมาทางอีเมลก็ได้</p>}
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
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <small className="register-field-hint">อย่างน้อย 10 ตัวอักษร และไม่ใช่รหัสที่เดาง่าย เช่น password123</small>
        </label>

        {form.role === "user" && (
          <div className="register-field-row">
            <label>
              ระดับการศึกษา (ไม่บังคับ)
              <input type="text" name="education" value={form.education} onChange={handleChange} />
            </label>
            <label>
              ประสบการณ์ทำงาน (ไม่บังคับ)
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
          มีบัญชีอยู่แล้ว? <Link to={`/login?${searchParams.toString()}`}>เข้าสู่ระบบ</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
