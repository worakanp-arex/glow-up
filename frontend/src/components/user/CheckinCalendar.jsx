import { useState } from "react";
import { CalendarCheck, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { buildMonthGrid, monthGroupLabel, formatThaiDate, WEEKDAY_LABELS } from "../../utils/calendarGrid.js";
import { HAPPINESS_LEVELS, happinessByLevel } from "../../constants/happiness.js";
import "./CheckinCalendar.css";

export default function CheckinCalendar({ history = [] }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end.getTime() - 83 * 86400000).toISOString().slice(0, 10);
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [year, month] = monthKey.split("-").map(Number);
  const records = new Map(history.map(day => [day.date, day]));
  const selected = records.get(selectedDate);
  const happiness = selected?.happinessLevel ? happinessByLevel(selected.happinessLevel) : null;
  const count = history.filter(day => day.done && day.date.startsWith(monthKey) && day.date >= start && day.date <= today).length;
  function changeMonth(delta) {
    const nextMonth = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
    setMonthKey(nextMonth);
    setSelectedDate(nextMonth === today.slice(0, 7) ? today : `${nextMonth}-01` < start ? start : `${nextMonth}-01`);
  }
  const DetailIcon = happiness?.icon || (selected?.done ? Check : CalendarCheck);
  return <section className="checkin-calendar">
    <div className="checkin-calendar-header">
      <div>
        <h2>ปฏิทินการเช็คอิน 12 สัปดาห์ล่าสุด</h2>
        <p className="checkin-calendar-range">{formatThaiDate(start)} – {formatThaiDate(today)} · แตะวันที่เพื่อดูรายละเอียด</p>
      </div>
      <div className="checkin-calendar-nav">
        <button type="button" aria-label="เดือนก่อนหน้า" disabled={monthKey <= start.slice(0, 7)} onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
        <strong aria-live="polite">{monthGroupLabel(year, month - 1)}</strong>
        <button type="button" aria-label="เดือนถัดไป" disabled={monthKey >= today.slice(0, 7)} onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
      </div>
    </div>
    <div className="checkin-calendar-days">
      {WEEKDAY_LABELS.map(label => <span className="checkin-weekday" key={label}>{label}</span>)}
      {buildMonthGrid(year, month - 1).map((cell, index) => {
        if (!cell) return <span key={`blank-${index}`} />;
        const unavailable = cell.dateKey < start || cell.dateKey > today;
        const record = records.get(cell.dateKey);
        const done = record?.done;
        const mood = done && record.happinessLevel ? happinessByLevel(record.happinessLevel) : null;
        const MoodIcon = mood?.icon;
        return <button key={cell.dateKey} type="button" disabled={unavailable}
          className={`checkin-day${done ? " done" : ""}${cell.dateKey === today ? " today" : ""}`}
          style={mood ? { "--checkin-mood": mood.color } : undefined}
          aria-label={`${formatThaiDate(cell.dateKey)} ${done ? `เช็คอินแล้ว${mood ? ` ${mood.label}` : ""}` : "ยังไม่ได้เช็คอิน"}`}
          aria-pressed={selectedDate === cell.dateKey} onClick={() => setSelectedDate(cell.dateKey)}>
          <span className="checkin-day-num">{cell.day}</span>
          {done
            ? <span className={`checkin-day-mark${mood ? " has-mood" : ""}`} aria-hidden="true">{MoodIcon ? <MoodIcon size={14} /> : <Check size={12} />}</span>
            : <span className="checkin-day-dot" />}
        </button>;
      })}
    </div>
    <div className="checkin-calendar-legend">
      {HAPPINESS_LEVELS.map(({ level, label, color }) => <span key={level}><i style={{ background: color }} aria-hidden="true" />{label}</span>)}
      <span><i className="is-blank" aria-hidden="true" />ยังไม่ได้เช็คอิน</span>
    </div>
    <div className="checkin-calendar-detail" role="status">
      <span className={`checkin-calendar-detail-icon${selected?.done ? " done" : ""}`} style={happiness ? { "--checkin-mood": happiness.color } : undefined} aria-hidden="true"><DetailIcon size={18} /></span>
      <span><strong>{formatThaiDate(selectedDate)}</strong> · {selected?.done ? `เช็คอินแล้ว${happiness ? ` · ${happiness.label}` : ""}` : "ยังไม่ได้เช็คอิน"}</span>
    </div>
    <small>เช็คอิน {count} วันในเดือนนี้ เฉพาะช่วง 12 สัปดาห์ล่าสุด</small>
  </section>;
}
