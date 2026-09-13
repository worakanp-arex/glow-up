import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, MessageCircle, Phone, Video } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as counsellingService from "../../services/counsellingService.js";
import BookingCalendar from "../../components/counselling/BookingCalendar.jsx";
import PatientOverviewWidget from "../../components/counsellor/PatientOverviewWidget.jsx";
import { moodByValue } from "../../constants/mood.js";
import {
  COUNSELLING_STATUS_LABELS,
  COUNSELLING_STATUS_CLASS,
  SESSION_TYPE_LABELS,
} from "../../constants/counsellingStatus.js";
import "./Queue.css";

const SESSION_TYPE_ICONS = { chat: MessageCircle, hotline: Phone, video: Video };

const FILTERS = [
  { value: "unclaimed", label: "รอรับเคส" },
  { value: "mine", label: "เคสของฉัน" },
  { value: "all", label: "ทั้งหมด" },
];

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function localDateKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function Queue() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("unclaimed");
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    Promise.all([counsellingService.getQueue(), counsellingService.getMySchedule()])
      .then(([sessionsData, scheduleData]) => {
        setSessions(sessionsData);
        setSchedule(scheduleData);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const visibleSessions = useMemo(() => {
    let list = sessions;
    if (filter === "unclaimed") list = list.filter((s) => !s.counsellor);
    else if (filter === "mine") list = list.filter((s) => s.counsellor?._id === user._id);

    if (selectedDate) {
      list = list.filter((s) => s.scheduledAt && localDateKey(s.scheduledAt) === selectedDate);
    }
    return list;
  }, [sessions, filter, selectedDate, user._id]);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="counsellor-queue-page"><AsyncState /></div>;
  }

  return (
    <div className="counsellor-queue-page">
      <PageHeader icon={HeartHandshake} description={<>ดูปฏิทินนัดหมายของคุณ และจัดการคำขอรับคำปรึกษาจากผู้ผ่านการบำบัด</>}>คำขอรับคำปรึกษา</PageHeader>

      <PatientOverviewWidget />

      <div className="counsellor-queue-layout">
        <div className="counsellor-queue-calendar-column">
          <BookingCalendar sessions={schedule} selectedDate={selectedDate} onSelectDate={setSelectedDate} compact />
        </div>

        <div className="counsellor-queue-list-column">
          <div className="counsellor-queue-filters">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`counsellor-queue-filter${filter === value ? " active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
            {selectedDate && (
              <button type="button" className="counsellor-queue-filter-clear" onClick={() => setSelectedDate(null)}>
                แสดงทุกวัน ×
              </button>
            )}
          </div>

          {visibleSessions.length === 0 ? (
            <p className="counsellor-queue-empty">ไม่มีคำขอในหมวดนี้</p>
          ) : (
            <ul className="counsellor-queue-list">
              {visibleSessions.map((session) => {
                const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || MessageCircle;
                const mood = moodByValue(session.mood);
                return (
                  <li key={session._id}>
                    <Link to={`/counsellor/requests/${session._id}`} className="counsellor-queue-item">
                      <span className="counsellor-queue-avatar">
                        {session.user?.avatarUrl ? (
                          <img src={session.user.avatarUrl} alt="" />
                        ) : (
                          initials(session.user?.name)
                        )}
                      </span>
                      <div className="counsellor-queue-body">
                        <p className="counsellor-queue-topic">
                          {session.topic}
                          <span className="counsellor-queue-patient"> · {session.user?.name}</span>
                        </p>
                        <p className="counsellor-queue-meta">
                          <TypeIcon size={13} />
                          {SESSION_TYPE_LABELS[session.sessionType]}
                          {mood && ` · ${mood.label}`}
                          {" · "}
                          {session.scheduledAt
                            ? `นัด ${formatDateTime(session.scheduledAt)}`
                            : `สะดวก ${formatDateTime(session.preferredAt)}`}
                        </p>
                      </div>
                      <div className="counsellor-queue-status-col">
                        <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
                          {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                        </span>
                        {session.counsellor && (
                          <span className="counsellor-queue-assignee">{session.counsellor.name}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Queue;
