import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CalendarClock, ShieldAlert, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as overviewService from "../../services/overviewService.js";
import { COUNSELLING_STATUS_LABELS, COUNSELLING_STATUS_CLASS } from "../../constants/counsellingStatus.js";
import { ROLE_LABELS } from "../../constants/roleLabels.js";
import "./OverviewUsers.css";

const KINDS = {
  active: { title: "ผู้ใช้งานใน 7 วันล่าสุด", icon: Users, description: "คนที่เข้าสู่ระบบในช่วง 7 วันที่ผ่านมา เรียงตามวันที่เข้าล่าสุด" },
  risk: { title: "ผู้ที่มีความเสี่ยงปานกลางถึงสูง", icon: ShieldAlert, description: "ผลประเมินความเสี่ยงล่าสุดที่อยู่ระดับปานกลางหรือสูง ไม่ใช่การวินิจฉัยทางการแพทย์" },
  appointments: { title: "นัดหมายวันนี้", icon: CalendarClock, description: "นัดหมายทั้งหมดที่กำหนดไว้ในวันนี้" },
};

const RISK_LABELS = { medium: "ความเสี่ยงปานกลาง", high: "ความเสี่ยงสูง" };
const DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
const TIME = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });

// The people behind a number on the overview: who they are and why they are counted.
function OverviewUsers() {
  const { kind } = useParams();
  const { user } = useAuth();
  const config = KINDS[kind];
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!config) return;
    overviewService
      .getOverviewUsers(kind)
      .then((result) => setData(Array.isArray(result) ? { items: [], total: 0, hidden: 0 } : result))
      .catch((error) => setLoadError(error));
  }, [kind, config]);

  if (!config) return <Navigate to="/counsellor/analytics" replace />;

  const detailBase = user.role === "admin" ? "/admin/users" : "/counsellor/patients";
  const header = <PageHeader icon={config.icon} eyebrow="Overview" description={config.description} backTo="/counsellor/analytics" backLabel="ภาพรวมผู้ใช้งาน">{config.title}</PageHeader>;

  if (loadError) return <div className="overview-users-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (!data) return <div className="overview-users-page">{header}<AsyncState /></div>;

  return (
    <div className="overview-users-page">
      {header}
      <p className="overview-users-count">ทั้งหมด <strong>{data.total}</strong> รายการ{data.hidden > 0 && ` · แสดง ${data.items.length} รายการที่คุณดูแลหรือเคยให้คำปรึกษา (อีก ${data.hidden} รายการเป็นของผู้ดูแลท่านอื่น)`}</p>

      {data.items.length === 0 ? (
        <p className="overview-users-empty">ไม่มีรายการให้แสดง</p>
      ) : (
        <ul className="overview-users-list">
          {data.items.map((item) => {
            const person = item.user;
            return (
              <li key={`${person?._id}-${item.sessionId || ""}`} className="ui-card">
                <Avatar user={person} size={48} />
                <div className="overview-users-text">
                  <strong>{person?.name || "ผู้ใช้งาน"}</strong>
                  {kind === "active" && <small>{ROLE_LABELS[person?.role] && `${ROLE_LABELS[person.role]} · `}เข้าล่าสุด {DATE.format(new Date(`${item.lastLogin}T00:00:00+07:00`))} · เข้าใช้ {item.days} วันใน 7 วัน</small>}
                  {kind === "risk" && <small>ประเมินเมื่อ {DATE.format(new Date(item.assessedAt))}</small>}
                  {kind === "appointments" && <small>{TIME.format(new Date(item.scheduledAt))} · {item.topic}{item.counsellor?.name && ` · ผู้ดูแล: ${item.counsellor.name}`}</small>}
                </div>
                {kind === "risk" && <span className={`overview-users-risk is-${item.level}`}>{RISK_LABELS[item.level]}</span>}
                {kind === "appointments" && <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[item.status] || ""}`}>{COUNSELLING_STATUS_LABELS[item.status]}</span>}
                {kind === "appointments" ? (
                  <Link to={`/counsellor/requests/${item.sessionId}`} className="ui-btn ui-btn-outline">ดูคำขอ</Link>
                ) : person?._id && (user.role === "admin" || !person.role || person.role === "user") && (
                  // A counsellor's profile view is for patients only; other roles have no page for them there.
                  <Link to={`${detailBase}/${person._id}`} className="ui-btn ui-btn-outline">ดูโปรไฟล์</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default OverviewUsers;
