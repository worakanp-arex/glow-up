import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAY_LABELS, buildMonthGrid } from "../../utils/calendarGrid.js";
import "./BookingCalendar.css";

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function localDateKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BookingCalendar({ sessions, selectedDate, onSelectDate, compact = false }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const countByDateKey = useMemo(() => {
    const map = new Map();
    for (const session of sessions || []) {
      if (!session.scheduledAt) continue;
      const key = localDateKey(session.scheduledAt);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [sessions]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayKey = localDateKey(today);

  function goPrev() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className={`booking-calendar-card${compact ? " compact" : ""}`}>
      <div className="booking-calendar-header">
        <h2>ปฏิทินนัดหมายของฉัน</h2>
        <div className="booking-calendar-nav">
          <button type="button" onClick={goPrev} aria-label="เดือนก่อนหน้า">
            <ChevronLeft size={18} />
          </button>
          <span className="booking-calendar-month-label">{monthLabel(year, month)}</span>
          <button type="button" onClick={goNext} aria-label="เดือนถัดไป">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="booking-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="booking-calendar-grid">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`blank-${index}`} className="booking-calendar-cell booking-calendar-cell-blank" />;
          }
          const count = countByDateKey.get(cell.dateKey) || 0;
          const isSelected = selectedDate === cell.dateKey;
          const isToday = cell.dateKey === todayKey;
          return (
            <button
              type="button"
              key={cell.dateKey}
              className={`booking-calendar-cell${count > 0 ? " has-bookings" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
              onClick={() => onSelectDate(isSelected ? null : cell.dateKey)}
            >
              <span className="booking-calendar-daynum">{cell.day}</span>
              {count > 0 && <span className="booking-calendar-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BookingCalendar;
