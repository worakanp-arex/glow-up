import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { buildMonthGrid, monthGroupLabel, formatThaiDate, WEEKDAY_LABELS } from "../../utils/calendarGrid.js";
import { happinessByLevel } from "../../constants/happiness.js";
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
  return <section className="checkin-calendar">
    <h2>ปฏิทินการเช็คอิน 12 สัปดาห์ล่าสุด</h2>
    <p className="checkin-calendar-range">{formatThaiDate(start)} – {formatThaiDate(today)} · แตะวันที่เพื่อดูรายละเอียด</p>
    <div className="checkin-calendar-nav">
      <button type="button" aria-label="เดือนก่อนหน้า" disabled={monthKey <= start.slice(0, 7)} onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></button>
      <strong aria-live="polite">{monthGroupLabel(year, month - 1)}</strong>
      <button type="button" aria-label="เดือนถัดไป" disabled={monthKey >= today.slice(0, 7)} onClick={() => changeMonth(1)}><ChevronRight size={20} /></button>
    </div>
    <div className="checkin-calendar-days">
      {WEEKDAY_LABELS.map(label => <span className="checkin-weekday" key={label}>{label}</span>)}
      {buildMonthGrid(year, month - 1).map((cell, index) => {
        if (!cell) return <span key={`blank-${index}`} />;
        const unavailable = cell.dateKey < start || cell.dateKey > today;
        const done = records.get(cell.dateKey)?.done;
        return <button key={cell.dateKey} type="button" disabled={unavailable}
          className={`checkin-day${done ? " done" : ""}${cell.dateKey === today ? " today" : ""}`}
          aria-label={`${formatThaiDate(cell.dateKey)} ${done ? "เช็คอินแล้ว" : "ยังไม่ได้เช็คอิน"}`}
          aria-pressed={selectedDate === cell.dateKey} onClick={() => setSelectedDate(cell.dateKey)}>
          <span>{cell.day}</span>{done ? <Check size={13} aria-hidden="true" /> : <span className="checkin-day-dot" />}
        </button>;
      })}
    </div>
    <div className="checkin-calendar-legend"><span><Check size={14} /> เช็คอินแล้ว</span><span>○ ยังไม่ได้เช็คอิน</span><span>กรอบฟ้า = วันนี้</span></div>
    <p className="checkin-calendar-detail" role="status"><strong>{formatThaiDate(selectedDate)}</strong> · {selected?.done ? `เช็คอินแล้ว${happiness ? ` · ${happiness.label}` : ""}` : "ยังไม่ได้เช็คอิน"}</p>
    <small>เช็คอิน {count} วันในเดือนนี้ เฉพาะช่วง 12 สัปดาห์ล่าสุด</small>
  </section>;
}
