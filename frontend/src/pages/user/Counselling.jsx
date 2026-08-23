import { useEffect, useState } from "react";
import { HeartHandshake, MessageCircle, Phone, Send, Video } from "lucide-react";
import * as counsellingService from "../../services/counsellingService.js";
import "./Counselling.css";

const SESSION_TYPE_LABELS = { chat: "แชท", hotline: "สายด่วน", video: "วิดีโอคอล" };
const SESSION_TYPE_ICONS = { chat: MessageCircle, hotline: Phone, video: Video };
const STATUS_LABELS = { pending: "รอดำเนินการ", active: "กำลังดำเนินการ", closed: "ปิดแล้ว" };
const STATUS_CLASS = { pending: "counselling-status-pending", active: "counselling-status-active", closed: "counselling-status-closed" };

const INITIAL_FORM = { sessionType: "chat", message: "" };

function Counselling() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    counsellingService
      .getMySessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await counsellingService.createSession(form);
      setSessions((prev) => [session, ...prev]);
      setForm(INITIAL_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="counselling-page">
      <h1>
        <HeartHandshake size={22} />
        <span>ขอรับคำปรึกษา</span>
      </h1>
      <p className="counselling-intro">
        ส่งคำขอรับคำปรึกษาไว้ก่อน ทีมงานจะติดต่อกลับผ่านช่องทางที่คุณเลือก
      </p>

      <div className="counselling-layout">
        <section>
          <h2>คำขอที่ผ่านมา</h2>
          {loading ? (
            <p>กำลังโหลด...</p>
          ) : sessions.length === 0 ? (
            <p className="counselling-empty">ยังไม่มีคำขอรับคำปรึกษา</p>
          ) : (
            <ul className="counselling-list">
              {sessions.map((session) => {
                const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || MessageCircle;
                return (
                  <li key={session._id}>
                    <div className="counselling-list-icon">
                      <TypeIcon size={18} />
                    </div>
                    <div className="counselling-list-body">
                      <p className="counselling-type">{SESSION_TYPE_LABELS[session.sessionType]}</p>
                      <p className="counselling-message">{session.message}</p>
                    </div>
                    <span className={`counselling-status-badge ${STATUS_CLASS[session.status] || ""}`}>
                      {STATUS_LABELS[session.status] || session.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="counselling-sidebar">
          <form className="counselling-form" onSubmit={handleSubmit}>
            <h2 className="counselling-form-title">ส่งคำขอใหม่</h2>
            <label>
              ช่องทางที่ต้องการ
              <select name="sessionType" value={form.sessionType} onChange={handleChange}>
                <option value="chat">แชท</option>
                <option value="hotline">สายด่วน</option>
                <option value="video">วิดีโอคอล</option>
              </select>
            </label>
            <label>
              รายละเอียดที่อยากปรึกษา
              <textarea name="message" value={form.message} onChange={handleChange} rows={4} required />
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} />
              <span>{submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}</span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default Counselling;
