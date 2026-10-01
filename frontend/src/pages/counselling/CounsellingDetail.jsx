import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Check, ClipboardList, Clock, Lock, MessageCircle, MessagesSquare, Phone, Send, UserRound, Video, X } from "lucide-react";
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

// Progress shown in the sidebar, derived only from fields the session already has.
function progressSteps(session) {
  const steps = [
    { label: "ส่งคำขอแล้ว", done: true, time: session.createdAt },
    { label: "บุคลากรรับเรื่อง", done: Boolean(session.counsellor) },
    { label: "ยืนยันวันเวลานัดหมาย", done: Boolean(session.scheduledAt), time: session.scheduledAt },
    session.status === "cancelled"
      ? { label: "ยกเลิกคำขอแล้ว", done: true, cancelled: true }
      : { label: "ปิดเคสเรียบร้อย", done: session.status === "closed" },
  ];
  const current = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({ ...step, current: index === current }));
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
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: "", meetingLink: "" });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [savingOutcome, setSavingOutcome] = useState(false);

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
        setOutcomeSummary(data.outcome?.summary || "");
      })
      .catch((err) => setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้"))
      .catch((error) => setLoadError(error))
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

  async function handleOutcomeSave(e) {
    e.preventDefault();
    if (!outcomeSummary.trim()) return;
    setSavingOutcome(true);
    try {
      const updated = await counsellingService.recordOutcome(id, outcomeSummary.trim());
      setSession(updated);
    } finally {
      setSavingOutcome(false);
    }
  }

  const HeaderIcon = SESSION_TYPE_ICONS[session?.sessionType] || MessageCircle;
  const pageHeader = (
    <PageHeader
      icon={HeaderIcon}
      backTo={isStaff ? "/counsellor" : "/counselling"}
      backLabel="รายการคำปรึกษา"
      description={session && (
        <span className="counselling-detail-meta">
          <span>{SESSION_TYPE_LABELS[session.sessionType]}</span>
          <span aria-hidden="true">·</span>
          <span>ขอไว้เมื่อ {formatDateTime(session.createdAt)}</span>
        </span>
      )}
      actions={session && (
        <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
          {COUNSELLING_STATUS_LABELS[session.status] || session.status}
        </span>
      )}
    >
      {session?.topic || "รายละเอียดคำปรึกษา"}
    </PageHeader>
  );

  if (loadError) return <div className="counselling-detail-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) return <div className="counselling-detail-page">{pageHeader}<AsyncState /></div>;
  if (error || !session) return <div className="counselling-detail-page">{pageHeader}{error || "ไม่พบข้อมูล"}</div>;

  const mood = moodByValue(session.mood);
  const isAssignedCounsellor = user.role === "counsellor" && session.counsellor?._id === user._id;
  const canManage = user.role === "admin" || isAssignedCounsellor;
  const isUnclaimed = !session.counsellor;
  const isClosedOut = session.status === "closed" || session.status === "cancelled";
  const canReply =
    !isClosedOut &&
    (user.role === "admin" || (user.role === "user" && session.user._id === user._id) || isAssignedCounsellor);

  return (
    <div className="counselling-detail-page">
      {pageHeader}

      <div className="counselling-detail-layout">
        <div className="counselling-detail-main">
          <section className="counselling-detail-card">
            <div className="counselling-detail-card-head">
              <h2>รายละเอียดคำขอ</h2>
            </div>
            {session.message && <blockquote className="counselling-detail-message">{session.message}</blockquote>}
            <dl className="counselling-detail-facts">
              <div className="counselling-detail-fact">
                <dt><HeaderIcon size={15} aria-hidden="true" />ช่องทาง</dt>
                <dd>{SESSION_TYPE_LABELS[session.sessionType] || "-"}</dd>
              </div>
              {mood && (
                <div className="counselling-detail-fact">
                  <dt><mood.icon size={15} aria-hidden="true" />ความรู้สึก</dt>
                  <dd>{mood.label}</dd>
                </div>
              )}
              <div className="counselling-detail-fact">
                <dt><Calendar size={15} aria-hidden="true" />วันเวลาที่สะดวก</dt>
                <dd>{formatDateTime(session.preferredAt) || "ไม่ได้ระบุ"}</dd>
              </div>
            </dl>
          </section>

          {(session.scheduledAt || canManage) && (
            <section className="counselling-detail-card">
              <div className="counselling-detail-card-head">
                <h2>นัดหมาย</h2>
              </div>
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

          <section className="counselling-detail-card counselling-chat-card">
            <div className="counselling-detail-card-head">
              <h2>ข้อความ</h2>
              <span className="counselling-detail-private"><Lock size={13} aria-hidden="true" />เฉพาะคุณและผู้ให้คำปรึกษา</span>
            </div>
            {session.messages.length === 0 ? (
              <div className="counselling-thread-empty">
                <span className="counselling-thread-empty-icon"><MessagesSquare size={22} aria-hidden="true" /></span>
                <p>ยังไม่มีข้อความ</p>
                {canReply && <small>เริ่มเล่าเท่าที่พร้อม ผู้ให้คำปรึกษาจะตอบกลับในพื้นที่นี้</small>}
              </div>
            ) : (
              <ul className="counselling-thread">
                {session.messages.map((msg) => (
                  <li key={msg._id} className={`counselling-thread-item ${msg.senderRole}${(msg.sender?._id || msg.sender) === user._id ? " is-mine" : ""}`}>
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
                  aria-label="ข้อความตอบกลับ"
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !replyText.trim()}>
                  <Send size={15} />
                  <span>{sending ? "กำลังส่ง..." : "ส่งข้อความ"}</span>
                </button>
              </form>
            )}
          </section>

          {canManage && (
            <section className="counselling-detail-card">
              <div className="counselling-detail-card-head">
                <h2>ผลการให้คำปรึกษา</h2>
              </div>
              {session.outcome?.summary && (
                <p className="counselling-detail-empty-note">
                  บันทึกล่าสุดโดย {session.outcome.recordedBy?.name || "-"} เมื่อ {formatDateTime(session.outcome.recordedAt)}
                </p>
              )}
              <form className="counselling-schedule-form" onSubmit={handleOutcomeSave}>
                <label>
                  สรุปผล/แผนติดตามต่อ
                  <textarea
                    value={outcomeSummary}
                    onChange={(e) => setOutcomeSummary(e.target.value)}
                    rows={4}
                    placeholder="เช่น อาการปัจจุบัน ข้อสรุปจากการพูดคุย และแผนติดตามครั้งถัดไป"
                  />
                </label>
                <button type="submit" className="btn btn-secondary" disabled={savingOutcome || !outcomeSummary.trim()}>
                  {savingOutcome ? "กำลังบันทึก..." : "บันทึกผลการให้คำปรึกษา"}
                </button>
              </form>
            </section>
          )}
        </div>

        <aside className="counselling-detail-sidebar">
          <section className="counselling-detail-card">
            <div className="counselling-detail-card-head">
              <h2>สถานะคำขอ</h2>
            </div>
            <ol className="counselling-progress">
              {progressSteps(session).map((step) => (
                <li
                  key={step.label}
                  className={`counselling-progress-step${step.done ? " is-done" : ""}${step.current ? " is-current" : ""}${step.cancelled ? " is-cancelled" : ""}`}
                  aria-current={step.current ? "step" : undefined}
                >
                  <span className="counselling-progress-dot" aria-hidden="true">
                    {step.cancelled ? <X size={12} /> : step.done ? <Check size={12} /> : step.current ? <Clock size={12} /> : null}
                  </span>
                  <span className="counselling-progress-copy">
                    <span>{step.label}</span>
                    {step.done && step.time && <small>{formatDateTime(step.time)}</small>}
                  </span>
                </li>
              ))}
            </ol>
          </section>

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
                <div className="counselling-person-waiting">
                  <span className="counselling-person-waiting-icon"><UserRound size={20} aria-hidden="true" /></span>
                  <div>
                    <p className="counselling-person-name">รอบุคลากรรับเรื่อง</p>
                    <p className="counselling-person-meta">เมื่อบุคลากรทางการแพทย์รับเรื่องแล้ว ชื่อผู้ดูแลจะแสดงที่นี่</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CounsellingDetail;
