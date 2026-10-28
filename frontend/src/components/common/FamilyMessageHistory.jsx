import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import * as familyService from "../../services/familyService.js";
import "./FamilyMessageHistory.css";

const MESSAGE_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// The conversation between a person and their linked family member, like a
// chat: oldest at the top, newest at the bottom. `viewerRole` is "family" or
// "user" so "mine" bubbles can be told apart. `refreshKey` reloads the list
// (e.g. after sending a new message elsewhere). With `canReply` a box under the
// list lets the viewer answer right here.
export default function FamilyMessageHistory({ linkId, viewerRole, refreshKey = 0, title = "ข้อความที่ผ่านมา", canReply = false }) {
  const [messages, setMessages] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!linkId) return undefined;
    let cancelled = false;
    familyService
      .getFamilyMessages(linkId)
      .then((data) => {
        if (cancelled) return;
        // The API answers newest first; a conversation reads the other way round.
        setMessages(Array.isArray(data) ? [...data].reverse() : []);
        setFailed(false);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [linkId, refreshKey, reloads]);

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function send(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    const lastFromOther = [...(messages || [])].reverse().find((message) => message.senderRole !== viewerRole);
    setSending(true);
    setSendError("");
    try {
      await familyService.sendEncouragementMessage(linkId, content, lastFromOther?._id);
      setDraft("");
      setReloads((count) => count + 1);
    } catch (err) {
      setSendError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

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
        <ul className="family-history-list" ref={listRef}>
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
      {canReply && !failed && messages !== null && (
        <form className="family-history-reply" onSubmit={send}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={500} placeholder="พิมพ์ข้อความตอบกลับ" aria-label="ข้อความตอบกลับ" />
          {sendError && <p className="family-history-error" role="alert">{sendError}</p>}
          <button type="submit" className="ui-btn ui-btn-primary" disabled={sending || !draft.trim()}>
            <Send size={15} aria-hidden="true" />{sending ? "กำลังส่ง..." : "ส่งข้อความ"}
          </button>
        </form>
      )}
    </section>
  );
}
