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

// Start / end instants of an Asia/Bangkok calendar day ("YYYY-MM-DD"), used for
// open and expiry dates that people enter as plain dates.
export function bangkokStartOfDay(dateKey) {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

export function bangkokEndOfDay(dateKey) {
  return new Date(`${dateKey}T23:59:59.999+07:00`);
}

// Mongo filter for "open right now" given optional startDate / endDate fields.
// `{ field: null }` also matches documents where the field is missing.
export function openWindowFilter(now = new Date()) {
  return {
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  };
}

export function isWithinWindow(doc, now = new Date()) {
  return !(doc.startDate && doc.startDate > now) && !(doc.endDate && doc.endDate < now);
}

// An optional "last day" typed as a plain date: undefined when the field was not
// sent, null when it was cleared, the end of that Bangkok day otherwise (so an
// item stays available through its last day). An unreadable value is an Invalid Date.
export function parseOptionalEndOfDay(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dateKey = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? bangkokEndOfDay(dateKey) : new Date(NaN);
}

// Mongo filter for items whose `expiresAt` has not passed; items without one never expire.
export function notExpiredFilter(now = new Date()) {
  return { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] };
}
