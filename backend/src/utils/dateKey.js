const BANGKOK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toBangkokDateKey(date) {
  return BANGKOK_FORMATTER.format(date);
}

export function shiftDateKey(dateKey, dayOffset) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

// ISO-8601 week key (e.g. "2026-W37") for the given date's Asia/Bangkok
// calendar day — used to dedupe one weekly check-in per user per week.
export function toIsoWeekKey(date) {
  const [year, month, day] = toBangkokDateKey(date).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  // Shift to the Thursday of this ISO week, then the ISO year is that
  // Thursday's year (standard ISO-8601 week-numbering rule).
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}
