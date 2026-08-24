export const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function formatThaiDate(dateKey) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(dateKey));
}

function weekdayOf(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Pads a chronological list of { date: "YYYY-MM-DD", ... } entries with
 * leading blanks so a 7-row, column-major grid lines up with real weekdays.
 */
export function buildCalendarCells(history) {
  if (history.length === 0) return [];
  const leadingBlanks = weekdayOf(history[0].date);
  return [...Array(leadingBlanks).fill(null), ...history];
}

/**
 * Builds a flat, row-major (Sun-start) month grid: leading/trailing `null`
 * blanks pad the first and last week out to full 7-day rows, so a plain
 * `grid-template-columns: repeat(7, 1fr)` lines up like a normal calendar app.
 */
export function buildMonthGrid(year, month) {
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = Array(startWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Buckets an already-date-sorted list into month groups, preserving order
 * (a Map keeps first-seen key order, so a newest-first input stays newest-first).
 */
export function groupByMonth(items, dateField) {
  const groups = new Map();
  for (const item of items) {
    const d = new Date(item[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, { key, year: d.getFullYear(), month: d.getMonth(), items: [] });
    }
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

export function monthGroupLabel(year, month) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}
