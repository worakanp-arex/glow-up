import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { WEEKDAY_LABELS, buildMonthGrid } from "../../utils/calendarGrid.js";
import "./DateTimePicker.css";

function pad(n) {
  return String(n).padStart(2, "0");
}

function parseValue(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  return { year: y, month: m - 1, day: d, hour: h, minute: min };
}

function toValue({ year, month, day, hour, minute }) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function formatDisplay(value) {
  const parsed = parseValue(value);
  if (!parsed) return null;
  const d = new Date(parsed.year, parsed.month, parsed.day);
  const datePart = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(d);
  return `${datePart} · ${pad(parsed.hour)}:${pad(parsed.minute)}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function DateTimePicker({ value, onChange, min, placeholder = "เลือกวันที่และเวลา" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const parsed = parseValue(value);
  const minParsed = parseValue(min);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const minDateKey = minParsed ? `${minParsed.year}-${pad(minParsed.month + 1)}-${pad(minParsed.day)}` : null;
  const selectedDateKey = parsed ? `${parsed.year}-${pad(parsed.month + 1)}-${pad(parsed.day)}` : null;

  function goPrev() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(cell) {
    const [y, m, d] = cell.dateKey.split("-").map(Number);
    onChange(
      toValue({
        year: y,
        month: m - 1,
        day: d,
        hour: parsed?.hour ?? 9,
        minute: parsed?.minute ?? 0,
      })
    );
  }

  function selectHour(hour) {
    if (!parsed) return;
    onChange(toValue({ ...parsed, hour: Number(hour) }));
  }

  function selectMinute(minute) {
    if (!parsed) return;
    onChange(toValue({ ...parsed, minute: Number(minute) }));
  }

  const display = formatDisplay(value);

  return (
    <div className="datetime-picker" ref={containerRef}>
      <button type="button" className="datetime-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <Calendar size={16} />
        <span className={display ? "" : "datetime-picker-placeholder"}>{display || placeholder}</span>
      </button>

      {open && (
        <div className="datetime-picker-panel">
          <div className="datetime-picker-cal-header">
            <button type="button" onClick={goPrev} aria-label="เดือนก่อนหน้า">
              <ChevronLeft size={16} />
            </button>
            <span>{monthLabel(viewYear, viewMonth)}</span>
            <button type="button" onClick={goNext} aria-label="เดือนถัดไป">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="datetime-picker-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="datetime-picker-grid">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`blank-${index}`} className="datetime-picker-cell datetime-picker-cell-blank" />;
              }
              const disabled = Boolean(minDateKey) && cell.dateKey < minDateKey;
              const selected = cell.dateKey === selectedDateKey;
              return (
                <button
                  type="button"
                  key={cell.dateKey}
                  className={`datetime-picker-cell${selected ? " selected" : ""}`}
                  disabled={disabled}
                  onClick={() => selectDay(cell)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="datetime-picker-time-row">
            <Clock size={15} />
            <select value={parsed?.hour ?? ""} onChange={(e) => selectHour(e.target.value)} disabled={!parsed}>
              {!parsed && <option value="">--</option>}
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span>:</span>
            <select value={parsed?.minute ?? ""} onChange={(e) => selectMinute(e.target.value)} disabled={!parsed}>
              {!parsed && <option value="">--</option>}
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary datetime-picker-confirm"
            onClick={() => setOpen(false)}
            disabled={!parsed}
          >
            ตกลง
          </button>
        </div>
      )}
    </div>
  );
}

export default DateTimePicker;
