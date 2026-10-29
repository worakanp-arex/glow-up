// เหตุผลที่โพสต์ถูกรายงาน frontend มีรายการนี้ซ้ำไว้ใน
// frontend/src/constants/reportReasons.js — ต้องแก้ให้ตรงกันทั้งสองที่
export const REPORT_REASONS = [
  { value: "inappropriate", label: "เนื้อหาไม่เหมาะสม" },
  { value: "misinformation", label: "ข้อมูลเท็จหรือทำให้เข้าใจผิด" },
  { value: "harassment", label: "ก้าวร้าว คุกคาม หรือด่าทอ" },
  { value: "substance", label: "ส่งเสริมการใช้สารเสพติด" },
  { value: "privacy", label: "เปิดเผยข้อมูลส่วนตัว" },
  { value: "spam", label: "สแปมหรือโฆษณา" },
  { value: "other", label: "อื่น ๆ" },
];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((reason) => reason.value);

export function reportReasonLabel(value) {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label || "อื่น ๆ";
}
