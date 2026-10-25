import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, ShieldCheck, UserPlus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getMyFamilyLinks, requestFamilyLink } from "../../services/familyService.js";
import FamilyDashboard from "./FamilyDashboard.jsx";
import "./FamilyDashboard.css";

export default function FamilyHome() {
  const { user } = useAuth();
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState("");

  useEffect(() => { getMyFamilyLinks().then(setLinks).catch(setError); }, []);

  async function handleRequest(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setRequestError("");
    try {
      await requestFamilyLink(email.trim());
      setRequested(true);
      setEmail("");
    } catch (err) {
      setRequestError(err.response?.data?.message || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  if (links?.length) return <FamilyDashboard links={links} />;
  return <div className="family-dashboard-page">
    <PageHeader art="family" icon={Heart} eyebrow="Family space" description="พื้นที่สำหรับครอบครัวและผู้ดูแล เพื่อติดตามความคืบหน้าและเป็นกำลังใจ">ติดตามครอบครัว</PageHeader>
    {error ? <AsyncState error onRetry={() => window.location.reload()} /> : !links ? <AsyncState /> : <div className="family-dashboard-grid family-home-grid">
      <section className="ui-card family-home-card">
        <span className="family-home-icon" aria-hidden="true"><UserPlus size={22} /></span>
        <h2>ยังไม่ได้เชื่อมกับสมาชิกในครอบครัว</h2>
        <p>ขอเชื่อมต่อกับคนที่คุณห่วงใยได้ทันที กรอกอีเมลที่เขาใช้สมัครสมาชิก แล้วเขาจะได้รับแจ้งเตือนให้กดอนุมัติ</p>
        <form className="family-home-form" onSubmit={handleRequest}>
          <label className="ui-field">
            อีเมลของคนที่คุณต้องการติดตาม
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
          </label>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={sending || !email.trim()}>
            <Mail size={15} aria-hidden="true" />{sending ? "กำลังส่ง..." : "ส่งคำขอเชื่อมต่อ"}
          </button>
        </form>
        {requested && <p className="family-home-sent" role="status">ส่งคำขอแล้ว หากอีเมลนี้เป็นของสมาชิกในระบบ เขาจะได้รับแจ้งเตือนให้พิจารณาอนุมัติ เมื่อเขาอนุมัติ คุณจะได้รับแจ้งเตือนทันที</p>}
        {requestError && <p className="family-dashboard-message-error" role="alert">{requestError}</p>}
        <hr className="ui-divider" />
        <p className="ui-muted">หรือรอคำเชิญ: ให้คนในครอบครัวส่งคำเชิญจากหน้าโปรไฟล์มายังอีเมล <strong>{user.email}</strong> แล้วเปิดลิงก์ในอีเมลเพื่อยืนยัน</p>
        <Link to="/profile" className="ui-btn ui-btn-outline">ตรวจสอบข้อมูลบัญชีของฉัน</Link>
      </section>
      <aside className="ui-card ui-card-soft family-home-privacy">
        <span className="family-home-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
        <h2>ความเป็นส่วนตัวมาก่อนเสมอ</h2>
        <p>คุณจะเห็นเฉพาะความคืบหน้าและรางวัลที่เจ้าของข้อมูลอนุญาตให้ติดตามเท่านั้น</p>
        <ul>
          <li>ไม่เห็นบันทึกอารมณ์หรือผลประเมินความเสี่ยง</li>
          <li>เจ้าของข้อมูลยกเลิกการเชื่อมต่อได้ทุกเมื่อ</li>
          <li>ส่งกำลังใจถึงกันได้ และเก็บข้อความไว้ย้อนอ่าน</li>
        </ul>
      </aside>
    </div>}
  </div>;
}
