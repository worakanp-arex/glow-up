import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import { WEEKDAY_LABELS, buildCalendarCells, formatThaiDate } from "../../utils/calendarGrid.js";
import "./EmotionCalendar.css";

function EmotionCalendar({ history, title = "ปฏิทินอารมณ์", subtitle = "ภาพรวมความรู้สึกในช่วง 12 สัปดาห์ที่ผ่านมา" }) {
  const calendarCells = buildCalendarCells(history || []);

  return (
    <div className="emotion-calendar-card">
      <div className="emotion-calendar-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="emotion-calendar">
        <div className="emotion-calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="emotion-calendar-grid">
          {calendarCells.map((day, index) => {
            if (!day) {
              return <span key={`blank-${index}`} className="emotion-calendar-cell emotion-calendar-cell-blank" />;
            }
            const happiness = day.happinessLevel ? happinessByLevel(day.happinessLevel) : null;
            const title = happiness ? `${formatThaiDate(day.date)} — ${happiness.label}` : formatThaiDate(day.date);
            return (
              <span
                key={day.date}
                className="emotion-calendar-cell"
                style={happiness ? { backgroundColor: happiness.color } : undefined}
                title={title}
              />
            );
          })}
        </div>
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
