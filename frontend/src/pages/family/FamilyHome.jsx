import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getMyFamilyLinks } from "../../services/familyService.js";
import FamilyDashboard from "./FamilyDashboard.jsx";
import "./FamilyDashboard.css";

export default function FamilyHome() {
  const { user } = useAuth();
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { getMyFamilyLinks().then(setLinks).catch(setError); }, []);
  if (links?.length) return <FamilyDashboard links={links} />;
  return <div className="family-dashboard-page">
    <PageHeader icon={Heart} description="พื้นที่สำหรับครอบครัวและผู้ดูแล เพื่อติดตามความคืบหน้าและเป็นกำลังใจ">ติดตามครอบครัว</PageHeader>
    {error ? <AsyncState error onRetry={() => window.location.reload()} /> : !links ? <AsyncState /> : <section className="family-welcome-card">
      <Mail size={32} aria-hidden="true" />
      <h2>ยังไม่ได้เชื่อมกับสมาชิกในครอบครัว</h2>
      <p>ให้คนในครอบครัวส่งคำเชิญจากหน้าโปรไฟล์มายังอีเมล <strong>{user.email}</strong> แล้วเปิดลิงก์ในอีเมลเพื่อยืนยันการติดตาม</p>
      <p>คุณจะเห็นเฉพาะความคืบหน้าและรางวัลที่เจ้าของข้อมูลอนุญาตให้ติดตาม</p>
      <Link to="/profile" className="btn btn-secondary">ตรวจสอบข้อมูลบัญชีของฉัน</Link>
    </section>}
  </div>;
}
