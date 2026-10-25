import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as counsellingService from "../../services/counsellingService.js";
import { onNotification } from "../../services/socket.js";
import Avatar from "../common/Avatar.jsx";
import "./CounsellingThread.css";

const POLL_MS = 15000;

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// The chat between a person and their counsellor: the message list and the
// reply box. There is no realtime channel for chat messages, so it re-reads the
// session every 15 seconds while the tab is visible, and immediately when a
// counselling notification arrives, so replies show up without a refresh.
export default function CounsellingThread({ session, onChange, canReply, emptyHint = "เริ่มเล่าเท่าที่พร้อม ผู้ให้คำปรึกษาจะตอบกลับในพื้นที่นี้" }) {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(session);
  useEffect(() => { latest.current = session; }, [session]);

  const sessionId = session._id;
  const isClosed = session.status === "closed" || session.status === "cancelled";

  useEffect(() => {
    if (isClosed) return undefined;
    let cancelled = false;
    async function refresh() {
      if (document.hidden) return;
      try {
        const fresh = await counsellingService.getSession(sessionId);
        const current = latest.current;
        if (!cancelled && (fresh.messages?.length !== current.messages?.length || fresh.status !== current.status || fresh.scheduledAt !== current.scheduledAt)) {
          onChange(fresh);
        }
      } catch {
        // keep showing what we have; the next tick will try again
      }
    }
    const timer = setInterval(refresh, POLL_MS);
    const unsubscribe = onNotification((notification) => {
      if (notification.type === "counselling" && notification.link?.includes(sessionId)) refresh();
    });
    return () => { cancelled = true; clearInterval(timer); unsubscribe(); };
  }, [sessionId, isClosed, onChange]);

  async function handleReply(event) {
    event.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    setError("");
    try {
      const updated = await counsellingService.addMessage(sessionId, replyText.trim());
      onChange(updated);
      setReplyText("");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  const messages = session.messages || [];

  return (
    <>
      {messages.length === 0 ? (
        <div className="counselling-thread-empty">
          <span className="counselling-thread-empty-icon"><MessagesSquare size={22} aria-hidden="true" /></span>
          <p>ยังไม่มีข้อความ</p>
          {canReply && <small>{emptyHint}</small>}
        </div>
      ) : (
        <ul className="counselling-thread">
          {messages.map((msg) => {
            const senderId = msg.sender?._id || msg.sender;
            const mine = senderId === user._id;
            return (
              <li key={msg._id} className={`counselling-thread-item ${msg.senderRole}${mine ? " is-mine" : ""}`}>
                <Avatar user={msg.sender?.name ? msg.sender : { name: mine ? user.name : undefined, role: msg.senderRole === "user" ? "user" : "counsellor" }} size={34} className="counselling-thread-avatar" />
                <div className="counselling-thread-body">
                  <p className="counselling-thread-author">
                    {msg.sender?.name || (mine ? "คุณ" : "ผู้ให้คำปรึกษา")}
                    <span className="counselling-thread-time">{formatDateTime(msg.createdAt)}</span>
                  </p>
                  <p className="counselling-thread-content">{msg.content}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isClosed && <p className="counselling-thread-closed">เคสนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้</p>}

      {canReply && !isClosed && (
        <form className="counselling-reply-form" onSubmit={handleReply}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="พิมพ์ข้อความตอบกลับ..."
            aria-label="ข้อความตอบกลับ"
          />
          {error && <p className="counselling-thread-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={sending || !replyText.trim()}>
            <Send size={15} />
            <span>{sending ? "กำลังส่ง..." : "ส่งข้อความ"}</span>
          </button>
        </form>
      )}
    </>
  );
}
