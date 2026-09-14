import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, ChevronDown, MessageCircle, Phone, Send, Video } from "lucide-react";
import * as counsellingService from "../../services/counsellingService.js";
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

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// datetime-local's `min` needs local-time "YYYY-MM-DDTHH:mm" — toISOString()
// is UTC and would let Bangkok users (UTC+7) pick a time up to 7h in the past.
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

  const historyGroups = useMemo(
    () => groupByMonth(sessions.slice(0, historyLimit), "createdAt"),
    [sessions, historyLimit]
  );

  useEffect(() => {
    counsellingService
      .getMySessions()
      .then(setSessions)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

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
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="counselling-page">
      <PageHeader icon={HeartHandshake} description={<>
        ส่งคำขอรับคำปรึกษาจากบุคลากรทางการแพทย์ พร้อมเลือกวันเวลาที่สะดวก บุคลากรจะตอบกลับและยืนยันนัดหมายให้คุณ
      </>}>ขอรับคำปรึกษา</PageHeader>

      <div className="counselling-layout">
        <aside className="counselling-sidebar">
          <form className="counselling-form" onSubmit={handleSubmit}>
            <h2 className="counselling-form-title">ส่งคำขอใหม่</h2>

            <div className="counselling-field">
              <span className="counselling-field-label">ช่องทางที่ต้องการ</span>
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

            <label>
              หัวข้อการคุย
              <input
                type="text"
                name="topic"
                value={form.topic}
                onChange={handleChange}
                placeholder="เช่น อยากปรึกษาเรื่องความเครียดในที่ทำงาน"
                required
              />
            </label>

            <label>
              รายละเอียดที่อยากปรึกษา
              <textarea name="message" value={form.message} onChange={handleChange} rows={4} required />
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

            {error && <p className="counselling-error">{error}</p>}
            {sentSession && <p className="counselling-sent" role="status">ส่งคำขอแล้ว <Link to={`/counselling/${sentSession._id}`}>ติดตามคำขอนี้</Link></p>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} />
              <span>{submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}</span>
            </button>
          </form>
        </aside>

        <section>
          <h2>คำขอที่ผ่านมา</h2>
          {loadError ? <AsyncState error description="โหลดคำขอที่ผ่านมาไม่สำเร็จ คุณยังส่งคำขอใหม่ได้" onRetry={() => window.location.reload()} /> : loading ? (
            <AsyncState />
          ) : sessions.length === 0 ? (
            <p className="counselling-empty">ยังไม่มีคำขอรับคำปรึกษา</p>
          ) : (
            <>
              {historyGroups.map((group) => (
                <div key={group.key} className="counselling-month-group">
                  <h3 className="counselling-month-heading">{monthGroupLabel(group.year, group.month)}</h3>
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
              {historyLimit < sessions.length && (
                <button
                  type="button"
                  className="btn btn-secondary counselling-load-more"
                  onClick={() => setHistoryLimit((prev) => prev + HISTORY_PAGE_SIZE)}
                >
                  <ChevronDown size={15} />
                  <span>แสดงเพิ่มเติม ({sessions.length - historyLimit} รายการที่เหลือ)</span>
                </button>
              )}
            </>
          )}
        </section>


      </div>
    </div>
  );
}

export default Counselling;
