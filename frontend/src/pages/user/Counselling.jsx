import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ExternalLink, Heart, HeartHandshake, Lock, MessageCircle, Phone, Send, UserRound, Video, XCircle } from "lucide-react";
import * as counsellingService from "../../services/counsellingService.js";
import CounsellingThread from "../../components/counselling/CounsellingThread.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import MoodSelect from "../../components/common/MoodSelect.jsx";
import DateTimePicker from "../../components/common/DateTimePicker.jsx";
import { MOOD_OPTIONS } from "../../constants/mood.js";
import {
  COUNSELLING_STATUS_LABELS,
  COUNSELLING_STATUS_CLASS,
  SESSION_TYPE_LABELS,
} from "../../constants/counsellingStatus.js";
import { groupByMonth, monthGroupLabel } from "../../utils/calendarGrid.js";
import "./Counselling.css";

const SESSION_TYPE_OPTIONS = [
  { value: "chat", label: "แชท", icon: MessageCircle },
  { value: "hotline", label: "สายด่วน", icon: Phone },
  { value: "video", label: "วิดีโอคอล", icon: Video },
];

const INITIAL_FORM = { sessionType: "chat", topic: "", message: "", mood: "", preferredAt: "" };
const HISTORY_PAGE_SIZE = 10;
const OPEN_STATUSES = ["pending", "active", "scheduled"];
const TOPIC_SUGGESTIONS = ["ความเครียด", "ความอยากใช้สาร", "ครอบครัว", "การเริ่มงาน"];

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// `min` ของ datetime-local ต้องใช้เวลาท้องถิ่น "YYYY-MM-DDTHH:mm" — toISOString()
// เป็น UTC และจะทำให้ผู้ใช้ในไทย (UTC+7) เลือกเวลาในอดีตได้ถึง 7 ชั่วโมง
function nowAsDatetimeLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Counselling() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentSession, setSentSession] = useState(null);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [historyTab, setHistoryTab] = useState("open");
  // สำเนาเต็ม (พร้อมแชทที่ populate แล้ว) ของคำขอที่ยังดำเนินอยู่
  const [detail, setDetail] = useState(null);
  const { confirm: requestConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    counsellingService
      .getMySessions()
      .then(setSessions)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  // บุคคลหนึ่งมีคำขอที่ดำเนินอยู่ได้ครั้งละหนึ่งรายการ: แชทและสถานะของมัน
  // จะแทนที่ฟอร์มคำขอจนกว่าเคสจะปิดหรือยกเลิก
  const activeSession = sessions.find((s) => OPEN_STATUSES.includes(s.status));
  const activeId = activeSession?._id;

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    counsellingService.getSession(activeId).then((data) => { if (!cancelled) setDetail(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeId]);

  function handleThreadChange(updated) {
    setDetail(updated);
    setSessions((prev) => prev.map((s) => (s._id === updated._id ? { ...s, status: updated.status, scheduledAt: updated.scheduledAt, counsellor: updated.counsellor } : s)));
  }

  function requestCancel() {
    requestConfirm({
      title: "ยกเลิกคำขอปรึกษานี้?",
      message: "คำขอจะถูกยกเลิกและบุคลากรที่รับเรื่องจะได้รับแจ้ง หลังจากนั้นคุณสามารถขอนัดหมายใหม่ได้",
      confirmLabel: "ยกเลิกคำขอ",
      errorMessage: "ยกเลิกคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      onConfirm: async () => {
        const cancelled = await counsellingService.cancelMySession(activeId);
        setSessions((prev) => prev.map((s) => (s._id === cancelled._id ? { ...s, status: cancelled.status } : s)));
        setSentSession(null);
      },
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.mood) {
      setError("กรุณาเลือกอารมณ์ในตอนนี้");
      return;
    }
    if (!form.preferredAt) {
      setError("กรุณาเลือกวันเวลาที่สะดวก");
      return;
    }
    setError("");
    setSentSession(null);
    setSubmitting(true);
    try {
      const session = await counsellingService.createSession({
        ...form,
        preferredAt: new Date(form.preferredAt).toISOString(),
      });
      setSessions((prev) => [session, ...prev]);
      setSentSession(session);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคำขอไม่สำเร็จ");
      // มีคำขออื่นดำเนินอยู่แล้ว (เช่น ส่งจากแท็บอื่น): แสดงคำขอนั้น
      if (err.response?.status === 409) counsellingService.getMySessions().then(setSessions).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }


  const activeSessions = sessions.filter((s) => OPEN_STATUSES.includes(s.status));
  const shownSessions = historyTab === "open" ? activeSessions : sessions;
  const shownDetail = detail && detail._id === activeId ? detail : null;
  const ActiveTypeIcon = SESSION_TYPE_OPTIONS.find((t) => t.value === activeSession?.sessionType)?.icon || MessageCircle;

  return (
    <div className="counselling-page">
      <PageHeader art="nurse" icon={HeartHandshake} eyebrow="A space to be heard" description="เลือกช่องทางที่สบายใจ และบอกเรื่องที่อยากคุยสั้น ๆ บุคลากรจะตอบกลับและยืนยันนัดหมายให้คุณ">
        คุยได้ ในจังหวะของคุณ
      </PageHeader>

      <div className="counselling-layout">
        <div className="counselling-sidebar">
          {activeSession ? (
            <section className="ui-card counselling-active" aria-label="คำขอที่กำลังดำเนินการ">
              <div className="counselling-form-head">
                <h2 className="counselling-form-title">คำขอของฉัน</h2>
                <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[activeSession.status] || ""}`}>
                  {COUNSELLING_STATUS_LABELS[activeSession.status] || activeSession.status}
                </span>
              </div>
              {sentSession && <p className="counselling-sent" role="status">ส่งคำขอแล้ว ระหว่างรอคุณพิมพ์ข้อความถึงผู้ให้คำปรึกษาได้ที่นี่</p>}
              <p className="counselling-active-topic"><ActiveTypeIcon size={18} aria-hidden="true" />{activeSession.topic}</p>
              <dl className="counselling-active-facts">
                <div><dt>ช่องทาง</dt><dd>{SESSION_TYPE_LABELS[activeSession.sessionType]}</dd></div>
                <div><dt>ผู้ดูแล</dt><dd>{activeSession.counsellor ? activeSession.counsellor.name : <span className="counselling-waiting"><UserRound size={14} aria-hidden="true" />รอบุคลากรรับเรื่อง</span>}</dd></div>
                <div><dt>นัดหมาย</dt><dd>{activeSession.scheduledAt ? formatDateTime(activeSession.scheduledAt) : "ยังไม่ยืนยันเวลา"}</dd></div>
              </dl>
              <p className="counselling-note"><CalendarDays size={15} aria-hidden="true" />ขอคำปรึกษาได้ครั้งละ 1 คำขอ เมื่อปิดเคสแล้วจึงขอนัดหมายใหม่ได้</p>

              <div className="counselling-active-chat">
                <h3>ข้อความระหว่างรอ</h3>
                {shownDetail ? (
                  <CounsellingThread session={shownDetail} onChange={handleThreadChange} canReply emptyHint="พิมพ์เพิ่มเติมได้ เช่น เวลาที่สะดวกหรือสิ่งที่อยากให้ทราบ" />
                ) : (
                  <AsyncState />
                )}
              </div>

              <div className="counselling-active-actions">
                <Link to={`/counselling/${activeSession._id}`} className="ui-btn ui-btn-outline"><ExternalLink size={15} aria-hidden="true" />เปิดรายละเอียดเต็ม</Link>
                <button type="button" className="ui-btn ui-btn-outline counselling-cancel" onClick={requestCancel}><XCircle size={15} aria-hidden="true" />ยกเลิกคำขอ</button>
              </div>
              {confirmDialog}
            </section>
          ) : (
          <form className="ui-card counselling-form" onSubmit={handleSubmit}>
            <div className="counselling-form-head">
              <h2 className="counselling-form-title">ขอคำปรึกษา</h2>
              <span className="checkin-private"><Lock size={12} aria-hidden="true" />เฉพาะคุณและผู้ให้คำปรึกษา</span>
            </div>

            <div className="counselling-field">
              <span className="counselling-field-label">อยากพูดคุยผ่านช่องทางไหน?</span>
              <div className="counselling-type-picker" role="radiogroup" aria-label="ช่องทางที่ต้องการ">
                {SESSION_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.sessionType === value}
                    className={`counselling-type-btn${form.sessionType === value ? " active" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, sessionType: value }))}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="counselling-field">
              <label className="ui-field">
                เรื่องที่อยากคุย
                <input
                  type="text"
                  name="topic"
                  value={form.topic}
                  onChange={handleChange}
                  placeholder="เช่น กังวลเรื่องการเริ่มงานใหม่"
                  required
                />
              </label>
              <div className="counselling-topic-chips">
                {TOPIC_SUGGESTIONS.map((topic) => (
                  <button key={topic} type="button" className={form.topic === topic ? "active" : ""} onClick={() => setForm((prev) => ({ ...prev, topic }))}>
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <label className="ui-field">
              รายละเอียดที่อยากให้ผู้ให้คำปรึกษาทราบ
              <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder="เล่าเท่าที่คุณสบายใจ..." required />
            </label>

            <div className="counselling-field">
              <span className="counselling-field-label">ตอนนี้คุณรู้สึกอย่างไร</span>
              <MoodSelect options={MOOD_OPTIONS} value={form.mood} onChange={value => setForm(prev => ({ ...prev, mood: value }))} />
            </div>

            <div className="counselling-field">
              <span className="counselling-field-label">วันเวลาที่สะดวก</span>
              <DateTimePicker
                value={form.preferredAt}
                onChange={(value) => setForm((prev) => ({ ...prev, preferredAt: value }))}
                min={nowAsDatetimeLocal()}
              />
            </div>

            <p className="counselling-note"><CalendarDays size={15} aria-hidden="true" />ผู้ให้คำปรึกษาจะยืนยันเวลานัดอีกครั้ง</p>

            {error && <p className="counselling-error">{error}</p>}
            {sentSession && <p className="counselling-sent" role="status">ส่งคำขอแล้ว <Link to={`/counselling/${sentSession._id}`}>ติดตามคำขอนี้</Link></p>}

            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={submitting}>
              <Send size={16} />
              <span>{submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอปรึกษา"}</span>
            </button>
          </form>
          )}
        </div>

        <div className="counselling-side">
          <section className="ui-card counselling-history">
            <div className="ui-card-head">
              <div>
                <h2>การนัดหมายของฉัน</h2>
                <h3 className="counselling-history-sub">คำขอที่ผ่านมา</h3>
              </div>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
            <div className="counselling-history-tabs" role="tablist" aria-label="ตัวกรองคำขอ">
              <button type="button" role="tab" aria-selected={historyTab === "open"} onClick={() => setHistoryTab("open")}>กำลังติดตาม</button>
              <button type="button" role="tab" aria-selected={historyTab === "all"} onClick={() => setHistoryTab("all")}>ประวัติ</button>
            </div>
            <div className="counselling-history-scroll">
            {loadError ? <AsyncState error description="โหลดคำขอที่ผ่านมาไม่สำเร็จ คุณยังส่งคำขอใหม่ได้" onRetry={() => window.location.reload()} /> : loading ? (
              <AsyncState />
            ) : shownSessions.length === 0 ? (
              <div className="counselling-none">
                <CalendarDays size={36} aria-hidden="true" />
                <strong>{historyTab === "open" ? "ยังไม่มีนัดหมาย" : "ยังไม่มีคำขอรับคำปรึกษา"}</strong>
                <span>คำขอของคุณจะแสดงตรงนี้<br />เมื่อส่งแบบฟอร์มด้านข้าง</span>
              </div>
            ) : (
              <>
                {groupByMonth(shownSessions.slice(0, historyLimit), "createdAt").map((group) => (
                  <div key={group.key} className="counselling-month-group">
                    <h4 className="counselling-month-heading">{monthGroupLabel(group.year, group.month)}</h4>
                    <ul className="counselling-list">
                      {group.items.map((session) => {
                        const TypeIcon =
                          SESSION_TYPE_OPTIONS.find((t) => t.value === session.sessionType)?.icon || MessageCircle;
                        return (
                          <li key={session._id}>
                            <Link to={`/counselling/${session._id}`} className="counselling-list-link">
                              <div className="counselling-list-icon">
                                <TypeIcon size={18} />
                              </div>
                              <div className="counselling-list-body">
                                <p className="counselling-topic">{session.topic}</p>
                                <p className="counselling-meta">
                                  {SESSION_TYPE_LABELS[session.sessionType]}
                                  {session.counsellor && ` · ${session.counsellor.name}`}
                                  {session.scheduledAt && ` · นัด ${formatDateTime(session.scheduledAt)}`}
                                </p>
                              </div>
                              <span
                                className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}
                              >
                                {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {historyLimit < shownSessions.length && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-outline ui-btn-block counselling-load-more"
                    onClick={() => setHistoryLimit((prev) => prev + HISTORY_PAGE_SIZE)}
                  >
                    <ChevronDown size={15} />
                    <span>แสดงเพิ่มเติม ({shownSessions.length - historyLimit} รายการที่เหลือ)</span>
                  </button>
                )}
              </>
            )}
            </div>
            {sessions.length > 0 && (
              <dl className="counselling-counts">
                <div><dt>รอดำเนินการ</dt><dd>{sessions.filter((s) => s.status === "pending").length}</dd></div>
                <div><dt>นัดหมายแล้ว</dt><dd>{sessions.filter((s) => s.status === "scheduled" || s.status === "active").length}</dd></div>
                <div><dt>ทั้งหมด</dt><dd>{sessions.length}</dd></div>
              </dl>
            )}
          </section>

          <section className="ui-card counselling-steps" aria-label="ขั้นตอนหลังส่งคำขอ">
            <h2>หลังส่งคำขอ จะเกิดอะไรขึ้น?</h2>
            <ol>
              <li><span>1</span><div><strong>ส่งคำขอ</strong><small>บอกเรื่องที่อยากคุยและเวลาที่สะดวก</small></div></li>
              <li><span>2</span><div><strong>ยืนยันนัดหมาย</strong><small>ผู้ให้คำปรึกษาตอบกลับและยืนยันเวลาอีกครั้ง</small></div></li>
              <li><span>3</span><div><strong>พูดคุยตามช่องทางที่เลือก</strong><small>แชท โทรศัพท์ หรือวิดีโอคอล ในจังหวะของคุณ</small></div></li>
            </ol>
          </section>

          <div className="counselling-reassure">
            <span aria-hidden="true"><Heart size={18} /></span>
            <div>
              <strong>เริ่มเล่าเท่าที่พร้อม</strong>
              <p>ไม่ต้องเตรียมคำตอบให้สมบูรณ์<br />เพียงเริ่มจากเรื่องที่มีความหมายกับคุณ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Counselling;
