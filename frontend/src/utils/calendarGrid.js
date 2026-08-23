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
