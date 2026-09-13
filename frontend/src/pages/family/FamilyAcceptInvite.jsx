import PageHeader from "../../components/common/PageHeader.jsx";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as familyService from "../../services/familyService.js";
import "./FamilyAcceptInvite.css";

function FamilyAcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleAccept() {
    setError("");
    setSubmitting(true);
    try {
      await familyService.acceptFamilyInvite({ email, token });
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "ยืนยันคำเชิญไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="family-accept-page">
        <PageHeader icon={Heart}>ลิงก์คำเชิญไม่ถูกต้อง</PageHeader>
        <p>ลิงก์นี้ไม่สมบูรณ์ กรุณาตรวจสอบอีเมลคำเชิญอีกครั้ง</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="family-accept-page">
        <PageHeader icon={Heart}>เข้าร่วมติดตามความคืบหน้า</PageHeader>
        <p>กรุณาเข้าสู่ระบบหรือสมัครสมาชิกด้วยอีเมล {email} ก่อน แล้วกลับมาที่ลิงก์นี้อีกครั้งเพื่อยืนยันคำเชิญ</p>
        <div className="family-accept-actions">
          <Link to="/login" className="btn btn-primary">
            เข้าสู่ระบบ
          </Link>
          <Link to="/register" className="btn btn-secondary">
            สมัครสมาชิก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="family-accept-page">
      <PageHeader icon={Heart}>เข้าร่วมติดตามความคืบหน้า</PageHeader>
      {error && <p className="family-accept-error">{error}</p>}
      {done ? (
        <p className="family-accept-success">ยืนยันคำเชิญเรียบร้อยแล้ว กำลังพาไปยังแดชบอร์ด...</p>
      ) : (
        <>
          <p>คุณจะเห็นเฉพาะระดับความสำเร็จและกำลังใจในเส้นทางฟื้นฟู ไม่เห็นข้อมูลสุขภาพโดยละเอียด</p>
          <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={submitting}>
            {submitting ? "กำลังยืนยัน..." : "ยืนยันคำเชิญ"}
          </button>
        </>
      )}
    </div>
  );
}

export default FamilyAcceptInvite;
