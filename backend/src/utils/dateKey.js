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

// รหัสสัปดาห์ ISO-8601 (เช่น "2026-W37") ของวันตามปฏิทิน Asia/Bangkok
// ของวันที่ที่ให้มา — ใช้กันการส่งแบบประเมินรายสัปดาห์ซ้ำ หนึ่งครั้งต่อผู้ใช้ต่อสัปดาห์
export function toIsoWeekKey(date) {
  const [year, month, day] = toBangkokDateKey(date).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  // เลื่อนไปวันพฤหัสบดีของสัปดาห์ ISO นี้ แล้วปี ISO คือปีของ
  // วันพฤหัสบดีนั้น (กฎการนับสัปดาห์มาตรฐานของ ISO-8601)
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

// เวลาเริ่ม/สิ้นสุดของวันตามปฏิทิน Asia/Bangkok ("YYYY-MM-DD") ใช้กับ
// วันเปิดและวันหมดอายุที่ผู้คนกรอกเป็นวันที่ธรรมดา
export function bangkokStartOfDay(dateKey) {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

export function bangkokEndOfDay(dateKey) {
  return new Date(`${dateKey}T23:59:59.999+07:00`);
}

// ตัวกรอง Mongo สำหรับ "เปิดอยู่ ณ ตอนนี้" จากฟิลด์ startDate / endDate ที่ไม่บังคับ
// `{ field: null }` ยังตรงกับเอกสารที่ไม่มีฟิลด์นั้นด้วย
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

// "วันสุดท้าย" ที่ไม่บังคับซึ่งพิมพ์เป็นวันที่ธรรมดา: undefined เมื่อไม่ได้ส่งฟิลด์
// null เมื่อล้างค่า มิฉะนั้นเป็นสิ้นวันตามเวลาไทยของวันนั้น (เพื่อให้
// รายการยังใช้ได้ตลอดวันสุดท้าย) ค่าที่อ่านไม่ได้จะเป็น Invalid Date
export function parseOptionalEndOfDay(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dateKey = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? bangkokEndOfDay(dateKey) : new Date(NaN);
}

// ตัวกรอง Mongo สำหรับรายการที่ `expiresAt` ยังไม่ผ่าน รายการที่ไม่มีค่านี้ไม่หมดอายุ
export function notExpiredFilter(now = new Date()) {
  return { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] };
}
