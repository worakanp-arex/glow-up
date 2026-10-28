import { useEffect, useState } from "react";
import { Check, Heart, Reply, Send } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import { READ_MESSAGE_VISIBLE_MS } from "../../constants/familyMessages.js";
import "./FamilyMessageCard.css";

const MESSAGE_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Shows the newest encouragement from a family member inside the welcome card,
// with "mark as read" and "reply". `data` is the /family/messages/latest
// response; `onChange` receives the updated message after reading or replying.
// Ten minutes after it was read the message leaves the home page (it stays in
// the history on the profile); `onExpire` lets the page fall back to its welcome.
export default function FamilyMessageCard({ data, onChange, onExpire }) {
  const { message, family, linkId } = data;
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const unread = !message.readAt;
  const readAtMs = message.readAt ? new Date(message.readAt).getTime() : null;
  const [expired, setExpired] = useState(readAtMs !== null && Date.now() - readAtMs >= READ_MESSAGE_VISIBLE_MS);

  useEffect(() => {
    if (readAtMs === null) { setExpired(false); return undefined; }
    const remaining = readAtMs + READ_MESSAGE_VISIBLE_MS - Date.now();
    if (remaining <= 0) { setExpired(true); return undefined; }
    setExpired(false);
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [readAtMs]);

  // Once the time is up, leave as soon as the person is not in the middle of writing a reply.
  const leaving = expired && !replying;
  useEffect(() => {
    if (leaving) onExpire?.();
  }, [leaving, onExpire]);
  if (leaving) return null;

  async function markRead() {
    setBusy(true);
    setError("");
    try {
      const updated = await familyService.markFamilyMessageRead(message._id);
      onChange({ ...data, message: updated, unreadCount: Math.max(0, (data.unreadCount || 1) - 1) });
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกสถานะไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await familyService.sendEncouragementMessage(linkId, reply.trim(), message._id);
      if (unread) await markRead();
      setReply("");
      setReplying(false);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`family-message-card${unread ? " is-unread" : ""}`}>
      <p className="family-message-label"><Heart size={14} aria-hidden="true" />{unread ? "ข้อความใหม่จากครอบครัว" : "ข้อความจากครอบครัว"}</p>
      <blockquote>“{message.content}”</blockquote>
      <p className="family-message-from">— {family?.name || "ครอบครัว"} · {MESSAGE_DATE.format(new Date(message.createdAt))}</p>
      {!unread && <p className="family-message-note">อ่านแล้ว · ข้อความนี้จะหายจากหน้าหลักใน 10 นาที (ดูย้อนหลังได้ที่โปรไฟล์)</p>}

      {sent && <p className="family-message-sent" role="status">ส่งข้อความตอบกลับแล้ว</p>}
      {error && <p className="family-message-error" role="alert">{error}</p>}

      {replying ? (
        <form className="family-message-reply" onSubmit={sendReply}>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={500} placeholder="พิมพ์ข้อความตอบกลับ" aria-label="ข้อความตอบกลับครอบครัว" autoFocus />
          <div className="family-message-actions">
            <button type="button" className="ui-btn ui-btn-outline" onClick={() => setReplying(false)} disabled={busy}>ยกเลิก</button>
            <button type="submit" className="ui-btn ui-btn-primary" disabled={busy || !reply.trim()}><Send size={15} aria-hidden="true" />{busy ? "กำลังส่ง..." : "ส่ง"}</button>
          </div>
        </form>
      ) : (
        <div className="family-message-actions">
          {unread && <button type="button" className="ui-btn ui-btn-outline" onClick={markRead} disabled={busy}><Check size={15} aria-hidden="true" />อ่านแล้ว</button>}
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => { setReplying(true); setSent(false); }}><Reply size={15} aria-hidden="true" />ตอบกลับ</button>
        </div>
      )}
    </div>
  );
}
