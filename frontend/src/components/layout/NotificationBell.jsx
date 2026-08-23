import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Bell, Briefcase, Newspaper, Sparkles } from "lucide-react";
import * as notificationService from "../../services/notificationService.js";
import { onNotification } from "../../services/socket.js";
import "./NotificationBell.css";

const TYPE_ICONS = {
  job: Briefcase,
  craving: Activity,
  reminder: Activity,
  news: Newspaper,
  system: Sparkles,
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    notificationService.getMyNotifications().then(setNotifications);
    const unsubscribe = onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev]);
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
    if (notification.status === "unread") {
      const updated = await notificationService.markAsRead(notification._id);
      setNotifications((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    }
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  }

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="notification-bell" ref={containerRef}>
      <button type="button" className="notification-bell-button" onClick={handleOpen} aria-label="การแจ้งเตือน">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell-panel">
          {notifications.length === 0 ? (
            <p className="notification-bell-empty">ไม่มีการแจ้งเตือน</p>
          ) : (
            <ul>
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                return (
                  <li
                    key={notification._id}
                    className={`${notification.status === "unread" ? "unread" : ""}${notification.link ? " clickable" : ""}`}
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
    </div>
  );
}

export default NotificationBell;
