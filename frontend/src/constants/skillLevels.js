// ระดับความชำนาญที่เก็บเป็น 1-5 ใน UserSkill.level แสดงด้วยป้ายภาษาไทย
export const SKILL_LEVELS = [
  { value: 1, label: "เริ่มต้น", description: "เพิ่งเริ่มเรียนรู้ ยังต้องมีคนแนะนำ" },
  { value: 2, label: "พื้นฐาน", description: "ทำงานง่าย ๆ ได้ แต่ยังต้องมีคนตรวจสอบ" },
  { value: 3, label: "ปานกลาง", description: "ทำงานได้เองโดยไม่ต้องมีคนคอยดู" },
  { value: 4, label: "ชำนาญ", description: "ทำงานได้คล่อง แก้ปัญหาเฉพาะหน้าได้" },
  { value: 5, label: "เชี่ยวชาญ", description: "สอนหรือให้คำแนะนำผู้อื่นได้" },
];

export function skillLevelLabel(level) {
  return SKILL_LEVELS.find((item) => item.value === Number(level))?.label || "ยังไม่ระบุ";
}
