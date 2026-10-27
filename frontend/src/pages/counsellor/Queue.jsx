import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, HeartHandshake, MessageCircle, Phone, Video } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as counsellingService from "../../services/counsellingService.js";
import BookingCalendar from "../../components/counselling/BookingCalendar.jsx";
import DayAppointments from "../../components/counselling/DayAppointments.jsx";
import PatientOverviewWidget from "../../components/counsellor/PatientOverviewWidget.jsx";
import { moodByValue } from "../../constants/mood.js";
import {
  COUNSELLING_STATUS_LABELS,
  COUNSELLING_STATUS_CLASS,
  SESSION_TYPE_LABELS,
} from "../../constants/counsellingStatus.js";
import "./Queue.css";
import Avatar from "../../components/common/Avatar.jsx";

const SESSION_TYPE_ICONS = { chat: MessageCircle, hotline: Phone, video: Video };
const PAGE_SIZE = 10;

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

function Queue() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("unclaimed");
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarScope, setCalendarScope] = useState("mine");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    counsellingService
      .getQueue()
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    if (filter === "unclaimed") return sessions.filter((s) => !s.counsellor);
    if (filter === "mine") return sessions.filter((s) => s.counsellor?._id === user._id);
    return sessions;
  }, [sessions, filter, user._id]);

  // The calendar is fed by the same list as the queue, so it also knows each
  // appointment's status (finished ones go grey) and who is responsible.
  const calendarSessions = useMemo(
    () => sessions.filter((s) => s.scheduledAt && (calendarScope === "all" || s.counsellor?._id === user._id)),
    [sessions, calendarScope, user._id]
  );
  const selectedDaySessions = selectedDate ? calendarSessions.filter((s) => localDateKey(s.scheduledAt) === selectedDate) : [];

  function changeFilter(value) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  const header = <PageHeader art="nurse" icon={HeartHandshake} description={<>ดูปฏิทินนัดหมาย และจัดการคำขอรับคำปรึกษาจากผู้ผ่านการบำบัด</>}>คำขอรับคำปรึกษา</PageHeader>;

  if (loadError) return <div className="counsellor-queue-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="counsellor-queue-page">{header}<AsyncState /></div>;
  }

  const visibleSessions = filteredSessions.slice(0, visibleCount);

  return (
    <div className="counsellor-queue-page">
      {header}

      <PatientOverviewWidget />

      <div className="counsellor-queue-layout">
        <div className="counsellor-queue-calendar-column">
          <BookingCalendar
            sessions={calendarSessions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            compact
            title={calendarScope === "mine" ? "ปฏิทินนัดหมายของฉัน" : "ปฏิทินนัดหมายทั้งหมด"}
            actions={(
              <div className="booking-calendar-scope" role="group" aria-label="ขอบเขตของปฏิทิน">
                <button type="button" aria-pressed={calendarScope === "mine"} onClick={() => setCalendarScope("mine")}>ของฉัน</button>
                <button type="button" aria-pressed={calendarScope === "all"} onClick={() => setCalendarScope("all")}>ทั้งหมด</button>
              </div>
            )}
          />
          {selectedDate && <DayAppointments dateKey={selectedDate} sessions={selectedDaySessions} />}
        </div>

        <div className="counsellor-queue-list-column">
          <div className="counsellor-queue-filters">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`counsellor-queue-filter${filter === value ? " active" : ""}`}
                onClick={() => changeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredSessions.length === 0 ? (
            <p className="counsellor-queue-empty">ไม่มีคำขอในหมวดนี้</p>
          ) : (
            <>
              <ul className="counsellor-queue-list">
                {visibleSessions.map((session) => {
                  const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || MessageCircle;
                  const mood = moodByValue(session.mood);
                  // Another counsellor's case: only its time, type, status and owner are shared.
                  if (session.restricted) {
                    return (
                      <li key={session._id}>
                        <div className="counsellor-queue-item is-restricted">
                          <span className="counsellor-queue-avatar"><Avatar user={null} size={40} fill /></span>
                          <div className="counsellor-queue-body">
                            <p className="counsellor-queue-topic">เคสที่ {session.counsellor?.name || "ผู้ให้คำปรึกษาท่านอื่น"} ดูแลอยู่</p>
                            <p className="counsellor-queue-meta">
                              <TypeIcon size={13} />
                              {SESSION_TYPE_LABELS[session.sessionType]}
                              {session.scheduledAt && ` · นัด ${formatDateTime(session.scheduledAt)}`}
                            </p>
                          </div>
                          <div className="counsellor-queue-status-col">
                            <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
                              {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={session._id}>
                      <Link to={`/counsellor/requests/${session._id}`} className="counsellor-queue-item">
                        <span className="counsellor-queue-avatar">
                          <Avatar user={session.user} size={40} fill />
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

              {(filteredSessions.length > PAGE_SIZE) && (
                <div className="counsellor-queue-more">
                  {visibleCount < filteredSessions.length && (
                    <button type="button" className="ui-btn ui-btn-outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                      <ChevronDown size={15} aria-hidden="true" />ดูเพิ่มเติม ({filteredSessions.length - visibleCount} รายการที่เหลือ)
                    </button>
                  )}
                  {visibleCount > PAGE_SIZE && (
                    <button type="button" className="ui-btn ui-btn-outline" onClick={() => setVisibleCount(PAGE_SIZE)}>
                      <ChevronUp size={15} aria-hidden="true" />ย่อรายการ
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Queue;
