import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import "./employer.css";

// Reminds an employer whose account hasn't been verified yet what that blocks.
export default function VerifyBanner() {
  const { user } = useAuth();
  if (user.verifiedStatus === "verified") return null;
  const rejected = user.verifiedStatus === "rejected" || user.verifiedStatus === "suspended";
  return (
    <div className={`employer-banner${rejected ? " is-danger" : ""}`} role="status">
      <ShieldAlert size={20} aria-hidden="true" />
      <div>
        <strong>{rejected ? "บัญชีนายจ้างของคุณไม่ผ่านการยืนยันตัวตน" : "บัญชีนายจ้างของคุณอยู่ระหว่างรอการยืนยันตัวตน"}</strong>
        <p>{rejected
          ? user.verificationNote ? `เหตุผล: ${user.verificationNote}` : "กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบข้อมูลบริษัทของคุณ"
          : "คุณสร้างประกาศงานได้ตามปกติ แต่จะดูรายชื่อและเอกสารของผู้สมัครได้หลังผู้ดูแลระบบยืนยันบัญชี"}</p>
      </div>
    </div>
  );
}
