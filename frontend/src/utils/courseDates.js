// ตัวช่วยวันเปิด/วันหมดอายุของคอร์ส (ลิงก์คอร์สภายนอกมีวันหมดอายุ) วันที่
// แสดงเป็นไทย (พ.ศ.) โดยใช้วันตามปฏิทิน Asia/Bangkok
const THAI_DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const ISO_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 3;

export function formatCourseDate(value) {
  return value ? THAI_DATE.format(new Date(value)) : null;
}

// "YYYY-MM-DD" (เวลาไทย) สำหรับ <input type="date"> เป็น "" เมื่อไม่ได้ตั้ง
export function toDateInputValue(value) {
  return value ? ISO_DAY.format(new Date(value)) : "";
}

// state: "expired" | "upcoming" | "expiring" | "active" | "open" (ไม่มีวันที่เลย)
export function courseStatus(course, now = new Date()) {
  const start = course?.startDate ? new Date(course.startDate) : null;
  const end = course?.endDate ? new Date(course.endDate) : null;
  if (end && end < now) return { state: "expired", label: "หมดอายุแล้ว" };
  if (start && start > now) return { state: "upcoming", label: `เปิดให้เรียน ${formatCourseDate(start)}` };
  if (end) {
    const days = Math.max(1, Math.ceil((end - now) / DAY_MS));
    if (days <= EXPIRING_SOON_DAYS) return { state: "expiring", label: days <= 1 ? "หมดอายุภายใน 1 วัน" : `เหลืออีก ${days} วัน`, days };
    return { state: "active", label: "เปิดให้เรียนอยู่", days };
  }
  return { state: "open", label: "ไม่มีวันหมดอายุ" };
}

// "เริ่ม 1 ก.ย. 2569 · สิ้นสุด 30 ก.ย. 2569"; null when the course has no dates.
export function courseRange(course) {
  const parts = [];
  if (course?.startDate) parts.push(`เริ่ม ${formatCourseDate(course.startDate)}`);
  if (course?.endDate) parts.push(`สิ้นสุด ${formatCourseDate(course.endDate)}`);
  return parts.length ? parts.join(" · ") : null;
}
