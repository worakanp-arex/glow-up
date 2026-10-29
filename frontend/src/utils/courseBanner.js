// ประกอบรายการสไลด์ของแบนเนอร์หน้าคอร์ส
//   1) คอร์สที่เรียนค้างไว้ (ถ้ามี) ขึ้นก่อนเสมอ
//   2) คอร์สที่เซิร์ฟเวอร์เลือกตามทักษะที่ผู้ใช้สนใจ/งานที่บันทึกไว้ (`featured`) พร้อมเหตุผล
//   3) เติมจากคอร์สที่เปิดอยู่ให้ได้อย่างน้อย BANNER_MIN สไลด์ เผื่อกรณีเจ้าหน้าที่ ผู้ใช้ที่ยังไม่ระบุทักษะ
//      หรือระบบแนะนำโหลดไม่สำเร็จ แบนเนอร์จะได้ยังเลื่อนวนได้
import { courseStatus } from "./courseDates.js";

export const BANNER_LIMIT = 5;
export const BANNER_MIN = 3;

// เหตุผลที่แนะนำคอร์สนี้ในรูปประโยคสั้นๆ (null เมื่อไม่มีเหตุผลเฉพาะ)
export function reasonText(reason) {
  if (reason?.source === "skill" && reason.label) return `ตรงกับทักษะที่คุณสนใจ: ${reason.label}`;
  if (reason?.source === "skill-category" && reason.label) return `เหมาะกับสายงานที่คุณสนใจ: ${reason.label}`;
  if (reason?.source === "saved-job" && reason.label) return `เพราะคุณบันทึกงาน “${reason.label}” ไว้`;
  return null;
}

// สไลด์: { course, eyebrow, reason, continuing, coverIndex }
// coverIndex คือตำแหน่งของคอร์สในรายการคอร์สทั้งหมด ใช้เลือกรูปสำรองตัวเดียวกับการ์ดคอร์สด้านล่าง
export function buildBannerSlides({ continuing, featured = [], courses = [], limit = BANNER_LIMIT }) {
  const slides = [];
  const seen = new Set();
  const indexOf = (course) => {
    const index = courses.findIndex((item) => item._id === course._id);
    return index === -1 ? undefined : index;
  };
  const add = (course, extra) => {
    if (!course || seen.has(course._id) || slides.length >= limit) return;
    seen.add(course._id);
    slides.push({ course, coverIndex: indexOf(course), ...extra });
  };

  add(continuing, { eyebrow: "เรียนต่อจากครั้งที่แล้ว", reason: null, continuing: true });
  for (const course of featured) add(course, { eyebrow: "แนะนำสำหรับคุณ", reason: reasonText(course.reason), continuing: false });
  // เจ้าหน้าที่โหลดคอร์สทุกสถานะมา จึงเติมเฉพาะคอร์สที่เรียนได้ตอนนี้ ไม่โปรโมตคอร์สที่หมดอายุหรือยังไม่เปิด
  for (const course of courses) {
    if (slides.length >= BANNER_MIN) break;
    if (["expired", "upcoming"].includes(courseStatus(course).state)) continue;
    add(course, { eyebrow: "แนะนำสำหรับคุณ", reason: null, continuing: false });
  }
  return slides;
}
