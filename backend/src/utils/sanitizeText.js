import sanitizeHtml from "sanitize-html";

// เนื้อหาชุมชนเป็นข้อความธรรมดา ไม่ใช่ rich text — ตัด markup ทั้งหมดออก
// แทนการอนุญาตเฉพาะบางแท็ก
export function sanitizeText(value) {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
