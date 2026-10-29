import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAY_LABELS, buildMonthGrid } from "../../utils/calendarGrid.js";
import "./BookingCalendar.css";

const FINISHED = "closed";
const OPEN = ["pending", "active", "scheduled"];

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function localDateKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// มุมมองรายเดือนของนัดหมาย วันจะเป็นสีน้ำเงินขณะที่ยังมีบางอย่างดำเนินอยู่
// เป็นสีเขียวเมื่อทุกอย่างเสร็จสิ้น และสีแดงเมื่อนัดหมายทั้งหมดในวันนั้นถูกยกเลิก
// ส่ง `title` / `actions` เพื่อใส่หัวข้อและตัวควบคุมไว้ด้านบน
function BookingCalendar({ sessions, selectedDate, onSelectDate, compact = false, title = "ปฏิทินนัดหมายของฉัน", actions = null }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const dayStats = useMemo(() => {
    const map = new Map();
    for (const session of sessions || []) {
      if (!session.scheduledAt) continue;
      const key = localDateKey(session.scheduledAt);
      const entry = map.get(key) || { open: 0, done: 0, cancelled: 0 };
      if (session.status === "cancelled") entry.cancelled += 1;
      else if (session.status === FINISHED) entry.done += 1;
      else if (OPEN.includes(session.status) || !session.status) entry.open += 1;
      map.set(key, entry);
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
        <h2>{title}</h2>
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
      {actions}

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
          const stats = dayStats.get(cell.dateKey);
          const count = stats ? stats.open + stats.done + stats.cancelled : 0;
          const isSelected = selectedDate === cell.dateKey;
          const isToday = cell.dateKey === todayKey;
          const tone = !stats ? "" : stats.open > 0 ? " has-open" : stats.done > 0 ? " all-done" : " all-cancelled";
          return (
            <button
              type="button"
              key={cell.dateKey}
              className={`booking-calendar-cell${tone}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
              onClick={() => onSelectDate(isSelected ? null : cell.dateKey)}
              aria-pressed={isSelected}
              aria-label={`${cell.day} ${monthLabel(year, month)}${count ? ` มีนัดหมาย ${count} รายการ` : ""}`}
            >
              <span className="booking-calendar-daynum">{cell.day}</span>
              {count > 0 && <span className="booking-calendar-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <ul className="booking-calendar-legend" aria-label="สีในปฏิทิน">
        <li><span className="legend-dot is-open" aria-hidden="true" />มีนัดที่ยังดำเนินอยู่</li>
        <li><span className="legend-dot is-done" aria-hidden="true" />นัดที่เสร็จแล้ว</li>
        <li><span className="legend-dot is-cancelled" aria-hidden="true" />นัดที่ยกเลิก</li>
      </ul>
    </div>
  );
}

export default BookingCalendar;
