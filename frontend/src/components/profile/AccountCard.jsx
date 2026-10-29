import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, ShieldCheck, UserPlus } from "lucide-react";
import StatusBadge from "../common/StatusBadge.jsx";
import DeleteAccountCard from "./DeleteAccountCard.jsx";
import * as authService from "../../services/authService.js";
import "./AccountCard.css";

const THAI_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });

// ข้อมูลบัญชีและฟอร์มเปลี่ยนรหัสผ่านที่แสดงข้างฟอร์มโปรไฟล์ สำหรับ
// บทบาทที่ไม่มีแท็บการฟื้นฟู (ครอบครัว นายจ้าง ผู้ให้คำปรึกษา แอดมิน)
export default function AccountCard({ user, roleLabel, children }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword.length < 10) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 10 ตัวอักษร");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    } catch (err) {
      setError(err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-col profile-col-side">
      <section className="ui-card account-card">
        <div className="ui-card-head">
          <h2>บัญชีของฉัน</h2>
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <dl className="profile-facts">
          <div><dt>อีเมลเข้าสู่ระบบ</dt><dd><Mail size={13} aria-hidden="true" /> {user.email}</dd></div>
          <div><dt>บทบาท</dt><dd>{roleLabel}</dd></div>
          <div><dt>สถานะบัญชี</dt><dd><StatusBadge status={user.verifiedStatus} /></dd></div>
          {user.createdAt && <div><dt>สมัครใช้งานเมื่อ</dt><dd>{THAI_DATE.format(new Date(user.createdAt))}</dd></div>}
        </dl>
        {user.role === "admin" && (
          <Link to="/admin/users?create=admin" className="ui-btn ui-btn-outline account-card-link">
            <UserPlus size={15} aria-hidden="true" />เพิ่มผู้ดูแลระบบคนอื่น
          </Link>
        )}
      </section>

      {children}

      <form className="ui-card account-card" onSubmit={handleSubmit}>
        <div className="ui-card-head">
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <KeyRound size={18} aria-hidden="true" />
        </div>
        {message && <p className="profile-message" role="status">{message}</p>}
        {error && <p className="profile-error" role="alert">{error}</p>}
        <div className="account-card-fields">
          <label className="ui-field">
            รหัสผ่านปัจจุบัน
            <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" required />
          </label>
          <label className="ui-field">
            รหัสผ่านใหม่
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} autoComplete="new-password" minLength={10} maxLength={128} required />
            <small>อย่างน้อย 10 ตัวอักษร และไม่ใช่รหัสที่เดาง่าย เช่น password123</small>
          </label>
          <label className="ui-field">
            ยืนยันรหัสผ่านใหม่
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} autoComplete="new-password" required />
          </label>
        </div>
        <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
        </button>
      </form>

      <DeleteAccountCard user={user} />
    </div>
  );
}
