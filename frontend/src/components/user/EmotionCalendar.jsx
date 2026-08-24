import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import { WEEKDAY_LABELS, buildMonthGrid } from "../../utils/calendarGrid.js";
import "./EmotionCalendar.css";

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function dayLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d)
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function EmotionCalendar({
  logs,
  title = "ปฏิทินอารมณ์",
  subtitle = "ดูภาพรวมความรู้สึกของคุณเป็นรายเดือน",
  onSelectEmptyDay,
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const logByDateKey = useMemo(() => {
    const map = new Map();
    for (const log of logs || []) {
      if (log.dateKey) map.set(log.dateKey, log);
    }
    return map;
  }, [logs]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  function goPrev() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (isCurrentMonth) return;
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="emotion-calendar-card">
      <div className="emotion-calendar-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="emotion-calendar-nav">
          <button type="button" onClick={goPrev} aria-label="เดือนก่อนหน้า">
            <ChevronLeft size={18} />
          </button>
          <span className="emotion-calendar-month-label">{monthLabel(year, month)}</span>
          <button type="button" onClick={goNext} disabled={isCurrentMonth} aria-label="เดือนถัดไป">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="emotion-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="emotion-calendar-grid">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`blank-${index}`} className="emotion-calendar-cell emotion-calendar-cell-blank" />;
          }
          const log = logByDateKey.get(cell.dateKey);
          const happiness = log?.happinessLevel ? happinessByLevel(log.happinessLevel) : null;
          const isFuture = cell.dateKey > todayKey;
          const clickable = Boolean(onSelectEmptyDay) && !happiness && !isFuture;
          const cellContent = (
            <span className={`emotion-calendar-daynum${happiness ? " emotion-calendar-daynum-filled" : ""}`}>
              {cell.day}
            </span>
          );

          if (clickable) {
            return (
              <button
                type="button"
                key={cell.dateKey}
                className="emotion-calendar-cell emotion-calendar-cell-clickable"
                title={`${dayLabel(cell.dateKey)} — แตะเพื่อบันทึกย้อนหลัง`}
                onClick={() => onSelectEmptyDay(cell.dateKey)}
              >
                {cellContent}
              </button>
            );
          }
          return (
            <span
              key={cell.dateKey}
              className="emotion-calendar-cell"
              style={happiness ? { backgroundColor: happiness.color } : undefined}
              title={happiness ? `${dayLabel(cell.dateKey)} — ${happiness.label}` : dayLabel(cell.dateKey)}
            >
              {cellContent}
            </span>
          );
        })}
      </div>

      <div className="emotion-calendar-legend">
        {HAPPINESS_LEVELS.map(({ level, label, color }) => (
          <span key={level} className="emotion-calendar-legend-item">
            <span className="emotion-calendar-legend-swatch" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default EmotionCalendar;
