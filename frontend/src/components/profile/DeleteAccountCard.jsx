import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import * as userService from "../../services/userService.js";
import { ACCOUNT_RETENTION_DAYS } from "../../constants/accountRetention.js";
import "./AccountCard.css";

// "ลบบัญชีของฉัน" ขออีเมลของบัญชี (และรหัสผ่านสำหรับ
// บัญชีที่มี) เพื่อให้เซสชันที่ถูกขโมยหรือลืมปิดทิ้งไว้ ไม่สามารถลบ
// ประวัติการฟื้นฟูของใครได้ในคลิกเดียว
export default function DeleteAccountCard({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setEmail("");
    setPassword("");
    setError("");
  }

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await userService.deleteMyAccount({ confirmEmail: email.trim(), password: password || undefined });
    } catch (err) {
      setError(err.response?.data?.message || "ลบบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setBusy(false);
      return;
    }
    // เซิร์ฟเวอร์สิ้นสุดเซสชันไปแล้ว ตรงนี้รีเซ็ตหน้าจอด้วย
    await logout().catch(() => {});
    navigate("/", { replace: true });
  }

  return (
    <section className="ui-card account-card account-card-danger">
      <div className="ui-card-head">
        <h2>ลบบัญชีของฉัน</h2>
        <Trash2 size={18} aria-hidden="true" />
      </div>
      <p className="account-card-note">
        เมื่อลบแล้ว คุณจะเข้าสู่ระบบไม่ได้ทันที ข้อมูลของคุณจะถูกเก็บไว้ {ACCOUNT_RETENTION_DAYS} วัน
        (ติดต่อผู้ดูแลระบบหากเปลี่ยนใจ จะกู้คืนให้ได้ในช่วงนี้) หลังจากนั้นชื่อ อีเมล และข้อความส่วนตัวทั้งหมดจะถูกลบถาวร
      </p>
      <button type="button" className="ui-btn ui-btn-outline account-card-danger-button" onClick={() => setOpen(true)}>
        <Trash2 size={15} aria-hidden="true" />ลบบัญชี
      </button>

      {open && (
        <ConfirmDialog
          title="ยืนยันการลบบัญชี"
          confirmLabel="ลบบัญชีของฉัน"
          busy={busy}
          error={error}
          onConfirm={handleConfirm}
          onClose={close}
          confirmDisabled={email.trim().toLowerCase() !== user.email.toLowerCase()}
        >
          <p>บัญชีจะถูกซ่อนและเข้าสู่ระบบไม่ได้ทันที ข้อมูลเก็บไว้ {ACCOUNT_RETENTION_DAYS} วันก่อนถูกลบถาวร</p>
          <p>พิมพ์อีเมลของบัญชีนี้ (<strong>{user.email}</strong>) เพื่อยืนยันว่าต้องการลบ</p>
          <label className="ui-field">
            อีเมลของบัญชี
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
          </label>
          <label className="ui-field">
            รหัสผ่านปัจจุบัน
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <small>บัญชีที่สมัครด้วย Google ไม่มีรหัสผ่าน ไม่ต้องกรอกช่องนี้</small>
          </label>
        </ConfirmDialog>
      )}
    </section>
  );
}
