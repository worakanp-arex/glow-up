import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Award, Bell, Briefcase, Heart, MessageCircle, Newspaper, Sparkles } from "lucide-react";
import * as notificationService from "../../services/notificationService.js";
import { onNotification } from "../../services/socket.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import "./NotificationBell.css";

const TYPE_ICONS = {
  job: Briefcase,
  craving: Activity,
  reminder: Activity,
  news: Newspaper,
  system: Sparkles,
  reward: Award,
  milestone: Heart,
  riskAlert: AlertTriangle,
  counselling: MessageCircle,
};

function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    notificationService.getMyNotifications().then(setNotifications).catch(() => setError("โหลดการแจ้งเตือนไม่สำเร็จ"));
    const unsubscribe = onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev.filter(item => item._id !== notification._id)]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((prev) => !prev);
  }

  async function handleNotificationClick(notification) {
    setError("");
    try {
      if (notification.status === "unread") {
        const updated = await notificationService.markAsRead(notification._id);
        setNotifications((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
      }
    } catch { setError("บันทึกสถานะการอ่านไม่สำเร็จ"); }
    const link = destination(notification);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  function destination(notification) {
    if (notification.type === "news") return notification.link?.includes("#news") ? notification.link : "/#news";
    if (notification.type === "counselling") {
      const id = notification.link?.match(/^\/(?:counselling|counsellor\/requests)\/([^/?#]+)$/)?.[1];
      if (id) return user?.role === "counsellor" ? `/counsellor/requests/${id}` : `/counselling/${id}`;
      return user?.role === "counsellor" ? "/counsellor" : "/counselling";
    }
    if (notification.link?.startsWith("/") && !notification.link.startsWith("//")) return notification.link;
    return { reward: "/streak", milestone: "/dashboard", reminder: "/craving-tracker", craving: "/craving-tracker", system: "/profile", job: user?.role === "employer" ? "/employer/jobs" : "/my-applications", counselling: user?.role === "counsellor" ? "/counsellor" : "/counselling" }[notification.type];
  }

  async function handleBulk(clear = false) {
    setBusy(true);
    setError("");
    const ids = new Set(notifications.map(item => item._id));
    try {
      if (clear) await notificationService.clearMyNotifications();
      else await notificationService.markAllAsRead();
      setNotifications(previous => clear ? previous.filter(item => !ids.has(item._id)) : previous.map(item => ids.has(item._id) ? { ...item, status: "read" } : item));
      setConfirmClear(false);
    } catch { setError(clear ? "ล้างรายการไม่สำเร็จ กรุณาลองอีกครั้ง" : "อ่านทั้งหมดไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setBusy(false); }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      containerRef.current?.querySelector("button")?.focus();
    }
  }

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="notification-bell" ref={containerRef} onKeyDown={handleKeyDown}>
      <button type="button" className="notification-bell-button" onClick={handleOpen} aria-label="การแจ้งเตือน" aria-expanded={open}>
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell-panel">
          <div className="notification-panel-heading"><strong>การแจ้งเตือน</strong><span>{unreadCount} ยังไม่อ่าน</span></div>
          <div className="notification-panel-actions">
            <button type="button" onClick={() => handleBulk()} disabled={busy || unreadCount === 0}>อ่านทั้งหมด</button>
            <button type="button" onClick={() => { setError(""); setConfirmClear(true); }} disabled={busy || notifications.length === 0}>ล้างรายการแจ้งเตือน</button>
          </div>
          {error && <p className="dialog-error" role="alert">{error}</p>}
          {notifications.length === 0 ? (
            <p className="notification-bell-empty">ไม่มีการแจ้งเตือน</p>
          ) : (
            <ul>
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                return (
                  <li
                    key={notification._id}
                    className={`${notification.status === "unread" ? "unread" : ""}${destination(notification) ? " clickable" : ""}`}
                    role="button" tabIndex={0}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleNotificationClick(notification); } }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notification-bell-icon">
                      <Icon size={15} />
                    </span>
                    <span className="notification-bell-body">
                      <p>{notification.message}</p>
                      <span>{new Date(notification.createdAt).toLocaleString("th-TH")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {confirmClear && <ConfirmDialog title="ล้างรายการแจ้งเตือนทั้งหมด" confirmLabel="ล้างรายการ" busy={busy} error={error} onConfirm={() => handleBulk(true)} onClose={() => setConfirmClear(false)}><p>รายการแจ้งเตือนจะถูกลบออกจากบัญชีของคุณ ประวัติการสนทนาและคำขอปรึกษายังอยู่ครบ</p></ConfirmDialog>}
    </div>
  );
}

export default NotificationBell;
