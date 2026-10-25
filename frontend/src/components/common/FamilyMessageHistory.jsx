import { useEffect, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import "./FamilyMessageHistory.css";

const MESSAGE_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Older messages between a person and their linked family member, newest first.
// `viewerRole` is "family" or "user" so "mine" bubbles can be told apart.
// `refreshKey` reloads the list (e.g. after sending a new message).
export default function FamilyMessageHistory({ linkId, viewerRole, refreshKey = 0, title = "ข้อความที่ผ่านมา" }) {
  const [messages, setMessages] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!linkId) return undefined;
    let cancelled = false;
    familyService
      .getFamilyMessages(linkId)
      .then((data) => { if (!cancelled) { setMessages(Array.isArray(data) ? data : []); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [linkId, refreshKey]);

  if (!linkId) return null;

  return (
    <section className="ui-card family-history" aria-label={title}>
      <div className="ui-card-head">
        <h2>{title}</h2>
        <MessageCircle size={18} aria-hidden="true" />
      </div>
      {failed ? (
        <p className="ui-muted">โหลดข้อความไม่สำเร็จ</p>
      ) : messages === null ? (
        <p className="ui-muted">กำลังโหลด...</p>
      ) : messages.length === 0 ? (
        <p className="ui-muted">ยังไม่มีข้อความ ข้อความกำลังใจที่ส่งถึงกันจะถูกเก็บไว้ที่นี่</p>
      ) : (
        <ul className="family-history-list">
          {messages.map((message) => (
            <li key={message._id} className={message.senderRole === viewerRole ? "is-mine" : ""}>
              <p>{message.content}</p>
              <small>
                {message.senderRole === viewerRole ? "คุณ" : message.senderRole === "family" ? <><Heart size={11} aria-hidden="true" /> ครอบครัว</> : "ผู้ใช้งาน"} · {MESSAGE_DATE.format(new Date(message.createdAt))}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
