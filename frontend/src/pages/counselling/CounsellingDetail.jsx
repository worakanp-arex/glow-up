import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Check,
  ClipboardList,
  MessageCircle,
  Phone,
  Send,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as counsellingService from "../../services/counsellingService.js";
import MeetingLinkBadge from "../../components/common/MeetingLinkBadge.jsx";
import DateTimePicker from "../../components/common/DateTimePicker.jsx";
import { moodByValue } from "../../constants/mood.js";
import {
  COUNSELLING_STATUS_LABELS,
  COUNSELLING_STATUS_CLASS,
  SESSION_TYPE_LABELS,
} from "../../constants/counsellingStatus.js";
import "./CounsellingDetail.css";

const SESSION_TYPE_ICONS = { chat: MessageCircle, hotline: Phone, video: Video };

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

// datetime-local inputs need a *local*-time "YYYY-MM-DDTHH:mm" value — slicing
// the ISO string directly would leave it in UTC and misalign by the tz offset.
function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CounsellingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: "", meetingLink: "" });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isStaff = user.role === "counsellor" || user.role === "admin";

  useEffect(() => {
    counsellingService
      .getSession(id)
      .then((data) => {
        setSession(data);
        setScheduleForm({
          scheduledAt: toDatetimeLocalValue(data.scheduledAt),
          meetingLink: data.meetingLink || "",
        });
      })
      .catch((err) => setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleClaim() {
    setClaiming(true);
    try {
      const updated = await counsellingService.claimSession(id);
      setSession(updated);
    } catch (err) {
      setError(err.response?.data?.message || "รับเคสไม่สำเร็จ");
    } finally {
      setClaiming(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const updated = await counsellingService.addMessage(id, replyText.trim());
      setSession(updated);
      setReplyText("");
    } finally {
      setSending(false);
    }
  }

  async function handleScheduleSave(e) {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      const payload = {};
      if (scheduleForm.scheduledAt) payload.scheduledAt = new Date(scheduleForm.scheduledAt).toISOString();
      if (scheduleForm.meetingLink) payload.meetingLink = scheduleForm.meetingLink;
      const updated = await counsellingService.updateSchedule(id, payload);
      setSession(updated);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleStatusChange(status) {
    const updated = await counsellingService.updateStatus(id, status);
    setSession(updated);
  }

  if (loading) return <div className="counselling-detail-page">กำลังโหลด...</div>;
  if (error || !session) return <div className="counselling-detail-page">{error || "ไม่พบข้อมูล"}</div>;

  const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || MessageCircle;
  const mood = moodByValue(session.mood);
  const backTo = isStaff ? "/counsellor" : "/counselling";
  const isAssignedCounsellor = user.role === "counsellor" && session.counsellor?._id === user._id;
  const canManage = user.role === "admin" || isAssignedCounsellor;
  const isUnclaimed = !session.counsellor;
  const isClosedOut = session.status === "closed" || session.status === "cancelled";
  const canReply =
    !isClosedOut &&
    (user.role === "admin" || (user.role === "user" && session.user._id === user._id) || isAssignedCounsellor);

  return (
    <div className="counselling-detail-page">
      <Link to={backTo} className="counselling-detail-back">
        <ArrowLeft size={16} />
        กลับ
      </Link>

      <div className="counselling-detail-header">
        <div className="counselling-detail-header-icon">
          <TypeIcon size={20} />
        </div>
        <div className="counselling-detail-header-body">
          <h1>{session.topic}</h1>
          <p className="counselling-detail-meta">
            {SESSION_TYPE_LABELS[session.sessionType]} · ขอไว้เมื่อ {formatDateTime(session.createdAt)}
          </p>
        </div>
        <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
          {COUNSELLING_STATUS_LABELS[session.status] || session.status}
        </span>
      </div>

      <div className="counselling-detail-layout">
        <div className="counselling-detail-main">
          <section className="counselling-detail-card">
            <h2>รายละเอียดคำขอ</h2>
            <p className="counselling-detail-message">{session.message}</p>
            <div className="counselling-detail-tags">
              {mood && (
                <span className="counselling-detail-tag">
                  <mood.icon size={14} />
                  {mood.label}
                </span>
              )}
              <span className="counselling-detail-tag">
                <Calendar size={14} />
                วันเวลาที่สะดวก: {formatDateTime(session.preferredAt)}
              </span>
            </div>
          </section>

          {(session.scheduledAt || canManage) && (
            <section className="counselling-detail-card">
              <h2>นัดหมาย</h2>
              {session.scheduledAt && (
                <p className="counselling-detail-scheduled">
                  <Calendar size={16} />
                  {formatDateTime(session.scheduledAt)}
                </p>
              )}
              {session.meetingLink && (
                <MeetingLinkBadge link={session.meetingLink} platform={session.meetingPlatform} />
              )}
              {!session.scheduledAt && !canManage && (
                <p className="counselling-detail-empty-note">ยังไม่มีการยืนยันวันเวลานัดหมาย</p>
              )}

              {canManage && (
                <form className="counselling-schedule-form" onSubmit={handleScheduleSave}>
                  <div className="counselling-schedule-field">
                    <span>วันเวลานัดหมาย</span>
                    <DateTimePicker
                      value={scheduleForm.scheduledAt}
                      onChange={(value) => setScheduleForm((f) => ({ ...f, scheduledAt: value }))}
                    />
                  </div>
                  <label>
                    ลิงก์สำหรับปรึกษา (Zoom, Google Meet ฯลฯ)
                    <input
                      type="url"
                      placeholder="https://..."
                      value={scheduleForm.meetingLink}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, meetingLink: e.target.value }))}
                    />
                  </label>
                  <button type="submit" className="btn btn-secondary" disabled={savingSchedule}>
                    {savingSchedule ? "กำลังบันทึก..." : "บันทึกนัดหมาย"}
                  </button>
                </form>
              )}
            </section>
          )}

          <section className="counselling-detail-card">
            <h2>ข้อความ</h2>
            {session.messages.length === 0 ? (
              <p className="counselling-detail-empty-note">ยังไม่มีข้อความ</p>
            ) : (
              <ul className="counselling-thread">
                {session.messages.map((msg) => (
                  <li key={msg._id} className={`counselling-thread-item ${msg.senderRole}`}>
                    <span className="counselling-thread-avatar">
                      {msg.sender?.avatarUrl ? (
                        <img src={msg.sender.avatarUrl} alt="" />
                      ) : (
                        initials(msg.sender?.name)
                      )}
                    </span>
                    <div className="counselling-thread-body">
                      <p className="counselling-thread-author">
                        {msg.sender?.name}
                        <span className="counselling-thread-time">{formatDateTime(msg.createdAt)}</span>
                      </p>
                      <p className="counselling-thread-content">{msg.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canReply && (
              <form className="counselling-reply-form" onSubmit={handleReply}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="พิมพ์ข้อความตอบกลับ..."
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !replyText.trim()}>
                  <Send size={15} />
                  <span>{sending ? "กำลังส่ง..." : "ส่งข้อความ"}</span>
                </button>
              </form>
            )}
          </section>
        </div>

        <aside className="counselling-detail-sidebar">
          {isStaff ? (
            <div className="counselling-detail-card">
              <h2>ผู้ขอรับคำปรึกษา</h2>
              <div className="counselling-person">
                <span className="counselling-person-avatar">
                  {session.user.avatarUrl ? (
                    <img src={session.user.avatarUrl} alt="" />
                  ) : (
                    initials(session.user.name)
                  )}
                </span>
                <div>
                  <p className="counselling-person-name">{session.user.name}</p>
                  <p className="counselling-person-meta">{session.user.email}</p>
                  {session.user.phone && <p className="counselling-person-meta">{session.user.phone}</p>}
                </div>
              </div>
              <Link
                to={`/counsellor/patients/${session.user._id}`}
                className="btn btn-secondary counselling-profile-link"
              >
                <ClipboardList size={15} />
                ดูโปรไฟล์ผู้ป่วย
              </Link>

              {isUnclaimed ? (
                <button
                  type="button"
                  className="btn btn-primary counselling-claim-btn"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  <Check size={15} />
                  {claiming ? "กำลังรับเคส..." : "รับเคสนี้"}
                </button>
              ) : (
                canManage && (
                  <div className="counselling-status-actions">
                    {!isClosedOut && (
                      <>
                        <button type="button" className="btn btn-secondary" onClick={() => handleStatusChange("closed")}>
                          ปิดเคส
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary counselling-cancel-btn"
                          onClick={() => handleStatusChange("cancelled")}
                        >
                          <X size={15} />
                          ยกเลิก
                        </button>
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="counselling-detail-card">
              <h2>บุคลากรผู้ดูแล</h2>
              {session.counsellor ? (
                <div className="counselling-person">
                  <span className="counselling-person-avatar">
                    {session.counsellor.avatarUrl ? (
                      <img src={session.counsellor.avatarUrl} alt="" />
                    ) : (
                      initials(session.counsellor.name)
                    )}
                  </span>
                  <div>
                    <p className="counselling-person-name">{session.counsellor.name}</p>
                    {session.counsellor.specialization && (
                      <p className="counselling-person-meta">{session.counsellor.specialization}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="counselling-detail-empty-note">
                  <UserIcon size={14} />
                  รอบุคลากรทางการแพทย์รับเรื่อง
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CounsellingDetail;
