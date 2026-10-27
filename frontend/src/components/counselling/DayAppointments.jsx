import { Link } from "react-router-dom";
import { Clock, Stethoscope, UserRound } from "lucide-react";
import Avatar from "../common/Avatar.jsx";
import { COUNSELLING_STATUS_LABELS, COUNSELLING_STATUS_CLASS } from "../../constants/counsellingStatus.js";
import "./DayAppointments.css";

const DAY_LABEL = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function time(iso) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

// Who is booked on the selected day, with the staff member responsible and the
// status of each appointment (finished ones are shown grey).
export default function DayAppointments({ dateKey, sessions }) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const items = sessions
    .filter((session) => session.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return (
    <section className="ui-card day-appointments" aria-label="นัดหมายของวันที่เลือก">
      <div className="ui-card-head">
        <h2>{DAY_LABEL.format(new Date(year, month - 1, day))}</h2>
      </div>
      {items.length === 0 ? (
        <p className="ui-muted">ไม่มีนัดหมายในวันนี้</p>
      ) : (
        <ul>
          {items.map((session) => {
            const finished = session.status === "closed";
            // Another counsellor's case is shown as a busy slot only; its detail page is off limits.
            if (session.restricted) {
              return (
                <li key={session._id} className={`is-restricted${finished ? " is-finished" : ""}`}>
                  <div className="day-appointments-row">
                    <Avatar user={null} size={40} />
                    <span className="day-appointments-text">
                      <strong>เคสของ {session.counsellor?.name || "ผู้ให้คำปรึกษาท่านอื่น"}</strong>
                      <small><Clock size={12} aria-hidden="true" />{time(session.scheduledAt)}</small>
                    </span>
                    <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
                      {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                    </span>
                  </div>
                </li>
              );
            }
            return (
              <li key={session._id} className={finished ? "is-finished" : ""}>
                <Link to={`/counsellor/requests/${session._id}`}>
                  <Avatar user={session.user} size={40} />
                  <span className="day-appointments-text">
                    <strong>{session.user?.name || "ผู้ใช้งาน"}</strong>
                    <small><Clock size={12} aria-hidden="true" />{time(session.scheduledAt)} · {session.topic}</small>
                    <small>
                      {session.counsellor
                        ? <><Stethoscope size={12} aria-hidden="true" />ผู้ดูแล: {session.counsellor.name}</>
                        : <><UserRound size={12} aria-hidden="true" />ยังไม่มีผู้ดูแล</>}
                    </small>
                  </span>
                  <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>
                    {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
