// Mirrors backend/src/constants/skills.js — keep the keys in sync.
export const SKILL_CATEGORIES = [
  { key: "service", label: "บริการและค้าปลีก" },
  { key: "food", label: "ครัวและอาหาร" },
  { key: "technical", label: "ช่างและซ่อมบำรุง" },
  { key: "digital", label: "ดิจิทัลและสำนักงาน" },
  { key: "logistics", label: "ขนส่งและคลังสินค้า" },
  { key: "craft", label: "เกษตรและงานฝีมือ" },
  { key: "care", label: "ดูแลและสุขภาพ" },
  { key: "soft-skill", label: "ทักษะชีวิตและการทำงาน" },
];

export function skillCategoryLabel(key) {
  return SKILL_CATEGORIES.find((category) => category.key === key)?.label || "อื่น ๆ";
}
