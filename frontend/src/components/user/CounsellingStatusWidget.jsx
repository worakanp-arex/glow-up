import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, MessageCircle, Phone, Video } from "lucide-react";
import * as counsellingService from "../../services/counsellingService.js";
import "./CounsellingStatusWidget.css";

const SESSION_TYPE_LABELS = { chat: "แชท", hotline: "สายด่วน", video: "วิดีโอคอล" };
const SESSION_TYPE_ICONS = { chat: MessageCircle, hotline: Phone, video: Video };
const STATUS_LABELS = { pending: "รอดำเนินการ", active: "กำลังดำเนินการ", closed: "ปิดแล้ว" };
const STATUS_CLASS = {
  pending: "counselling-widget-status-pending",
  active: "counselling-widget-status-active",
  closed: "counselling-widget-status-closed",
};

function CounsellingStatusWidget() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    counsellingService
      .getMySessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const latest = sessions[0];
  const TypeIcon = latest ? SESSION_TYPE_ICONS[latest.sessionType] || MessageCircle : HeartHandshake;

  return (
    <Link to="/counselling" className="counselling-widget">
      <div className="counselling-widget-icon">
        <TypeIcon size={20} />
      </div>
      <div className="counselling-widget-body">
        <h2>การให้คำปรึกษา</h2>
        {loading ? (
          <p className="counselling-widget-loading">กำลังโหลด...</p>
        ) : !latest ? (
          <p className="counselling-widget-empty">ยังไม่มีคำขอรับคำปรึกษา — ส่งคำขอได้ทุกเมื่อ</p>
        ) : (
          <>
            <p className="counselling-widget-message">
              {SESSION_TYPE_LABELS[latest.sessionType]}: {latest.message}
            </p>
            <span className={`counselling-widget-status ${STATUS_CLASS[latest.status] || ""}`}>
              {STATUS_LABELS[latest.status] || latest.status}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

export default CounsellingStatusWidget;
