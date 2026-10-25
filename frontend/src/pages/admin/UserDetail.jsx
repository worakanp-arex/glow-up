import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import { coverStyle } from "../../components/common/CoverPicker.jsx";
import useReasonDialog from "../../components/common/useReasonDialog.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Ban, CalendarHeart, Check, ClipboardList, Mail, MapPin, Phone, RotateCcw, UserRound, X } from "lucide-react";
import * as userService from "../../services/userService.js";
import { COVER_PRESETS, DEFAULT_COVER_PRESET } from "../../constants/profileArt.js";
import { ROLE_LABELS } from "../../constants/roleLabels.js";
import "./UserDetail.css";

const DATE_TIME = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });

// Fields shown per role, in order. Empty ones read "ยังไม่ระบุ" so gaps are visible.
const FIELDS = {
  common: [["nickname", "ชื่อที่อยากให้เรียก"], ["phone", "โทรศัพท์"], ["province", "จังหวัด"], ["age", "อายุ"], ["gender", "เพศ"], ["address", "ที่อยู่"]],
  user: [["education", "การศึกษา"], ["experience", "ประสบการณ์"], ["familyName", "ชื่อครอบครัว"]],
  family: [],
  employer: [["companyName", "ชื่อบริษัท"], ["businessType", "ประเภทธุรกิจ"], ["taxId", "เลขประจำตัวผู้เสียภาษี"], ["contactPosition", "ตำแหน่งผู้ติดต่อ"], ["companySize", "ขนาดบริษัท"], ["website", "เว็บไซต์"], ["companyDescription", "แนะนำบริษัท"]],
  counsellor: [["specialization", "ความเชี่ยวชาญ"], ["hospital", "สังกัด"], ["education", "วุฒิการศึกษา"], ["experience", "ประสบการณ์"]],
  admin: [["position", "ตำแหน่ง"], ["department", "หน่วยงาน"]],
};

function UserDetail() {
  const { userId } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState("");
  const { askReason, reasonDialog } = useReasonDialog();

  useEffect(() => {
    userService
      .getUser(userId)
      .then((data) => setPerson(Array.isArray(data) ? null : data))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [userId]);

  async function setStatus(status, reason) {
    setActionError("");
    try {
      setPerson(await userService.verifyUser(userId, status, reason));
    } catch (err) {
      setActionError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
      throw err;
    }
  }

  function reject(status) {
    askReason({
      title: status === "suspended" ? "ระงับการใช้งานบัญชีนี้" : "ปฏิเสธการยืนยันตัวตน",
      description: "เหตุผลจะถูกส่งให้เจ้าของบัญชีในการแจ้งเตือน",
      confirmLabel: status === "suspended" ? "ระงับบัญชี" : "ปฏิเสธ",
      onConfirm: (reason) => setStatus(status, reason),
    });
  }

  const header = <PageHeader icon={UserRound} eyebrow="Admin" backTo="/admin/users" backLabel="จัดการผู้ใช้งาน">{person?.name || "รายละเอียดผู้ใช้งาน"}</PageHeader>;

  if (loadError) return <div className="admin-user-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="admin-user-page">{header}<AsyncState /></div>;
  if (!person) return <div className="admin-user-page">{header}<AsyncState empty title="ไม่พบผู้ใช้งานนี้" /></div>;

  const cover = COVER_PRESETS.find((item) => item.key === (person.coverPreset || DEFAULT_COVER_PRESET)) || COVER_PRESETS[0];
  const fields = [...FIELDS.common, ...(FIELDS[person.role] || [])];

  return (
    <div className="admin-user-page">
      {header}
      {reasonDialog}

      <section className="ui-card admin-user-hero">
        <div className="admin-user-cover" style={coverStyle(cover)} />
        <div className="admin-user-hero-body">
          <span className="admin-user-avatar"><Avatar user={person} size={104} fill alt={person.name} /></span>
          <div className="admin-user-hero-text">
            <h2>{person.name}</h2>
            <p><Mail size={14} aria-hidden="true" />{person.email}</p>
            <div className="admin-user-badges">
              <span className="admin-user-role">{ROLE_LABELS[person.role]}</span>
              <StatusBadge status={person.verifiedStatus} />
            </div>
          </div>
        </div>
      </section>

      <div className="admin-user-grid">
        <section className="ui-card">
          <div className="ui-card-head"><h2>ข้อมูลโปรไฟล์</h2></div>
          <dl className="admin-user-facts">
            {fields.map(([key, label]) => (
              <div key={key}><dt>{label}</dt><dd>{person[key] ? String(person[key]) : <span className="ui-muted">ยังไม่ระบุ</span>}</dd></div>
            ))}
            <div><dt>สมัครเมื่อ</dt><dd>{person.createdAt ? DATE_TIME.format(new Date(person.createdAt)) : "-"}</dd></div>
          </dl>
          {person.bio && <p className="admin-user-bio">{person.bio}</p>}
        </section>

        <aside className="admin-user-side">
          <section className="ui-card">
            <div className="ui-card-head"><h2>สถานะบัญชี</h2></div>
            <p className="admin-user-status-line"><StatusBadge status={person.verifiedStatus} /></p>
            {person.verificationNote && person.verifiedStatus !== "verified" && (
              <p className="admin-user-note"><strong>เหตุผลที่บันทึกไว้:</strong> {person.verificationNote}</p>
            )}
            {actionError && <p className="admin-user-error" role="alert">{actionError}</p>}
            <div className="admin-user-actions">
              {person.verifiedStatus !== "verified" && (
                <button type="button" className="ui-btn ui-btn-primary" onClick={() => setStatus("verified")}>
                  {person.verifiedStatus === "suspended" ? <RotateCcw size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                  {person.verifiedStatus === "suspended" ? "ยกเลิกการระงับ" : "ยืนยันบัญชี"}
                </button>
              )}
              {person.verifiedStatus === "pending" && (
                <button type="button" className="ui-btn ui-btn-outline" onClick={() => reject("rejected")}><X size={15} aria-hidden="true" />ปฏิเสธ</button>
              )}
              {person.verifiedStatus !== "suspended" && person.role !== "admin" && (
                <button type="button" className="ui-btn ui-btn-outline" onClick={() => reject("suspended")}><Ban size={15} aria-hidden="true" />ระงับการใช้งาน</button>
              )}
            </div>
          </section>

          {person.role === "user" && (
            <section className="ui-card admin-user-links">
              <div className="ui-card-head"><h2>ข้อมูลการฟื้นฟู</h2></div>
              <Link to={`/counsellor/patients/${person._id}`}><ClipboardList size={15} aria-hidden="true" />โปรไฟล์ผู้ป่วยและประวัติ</Link>
              <Link to={`/admin/users/${person._id}/emotion`}><CalendarHeart size={15} aria-hidden="true" />ปฏิทินอารมณ์</Link>
            </section>
          )}
          {(person.phone || person.province) && (
            <p className="ui-muted admin-user-contact">
              {person.phone && <span><Phone size={13} aria-hidden="true" />{person.phone}</span>}
              {person.province && <span><MapPin size={13} aria-hidden="true" />{person.province}</span>}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default UserDetail;
