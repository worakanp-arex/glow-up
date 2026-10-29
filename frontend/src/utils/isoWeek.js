// สะท้อนรหัสสัปดาห์ ISO ของ backend (เช่น "2026-W37") ใช้ฝั่งไคลเอนต์
// เพื่อตัดสินเท่านั้นว่ามีเช็คอิน "ของสัปดาห์นี้" แล้วหรือยัง
export function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}
