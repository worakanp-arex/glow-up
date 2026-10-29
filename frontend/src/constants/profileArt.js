// รูปโปรไฟล์และพื้นหลังปกที่ผู้ใช้เลือกได้โดยไม่ต้อง
// อัปโหลด ไคลเอนต์ส่งเฉพาะ *key* ของ preset เซิร์ฟเวอร์แปลงเป็น
// URL ด้านล่าง ดังนั้นจะไม่มีทางเก็บ URL รูปภาพอะไรก็ได้ในโปรไฟล์
// frontend มีไฟล์เดียวกันนี้ที่ frontend/src/constants/profileArt.js
export const AVATAR_PRESETS = [
  { key: "user", label: "ตัวละครเริ่มต้น", url: "/images/avatars/user.webp" },
  { key: "staff", label: "ทีมดูแล", url: "/images/avatars/staff.webp" },
  { key: "family", label: "ครอบครัว", url: "/images/avatars/family.webp" },
  { key: "mascot", label: "น้องกำลังใจ", url: "/images/illustrations/mascot.webp" },
  { key: "nurse", label: "พยาบาลใจดี", url: "/images/illustrations/nurse.webp" },
  { key: "mood-happy", label: "ยิ้มแย้ม", url: "/images/illustrations/mood-happy.webp" },
  { key: "mood-calm", label: "สงบ", url: "/images/illustrations/mood-calm.webp" },
  { key: "mood-confident", label: "มั่นใจ", url: "/images/illustrations/mood-confident.webp" },
  { key: "mood-relaxed", label: "ผ่อนคลาย", url: "/images/illustrations/mood-relaxed.webp" },
  { key: "mood-surprised", label: "ตื่นเต้น", url: "/images/illustrations/mood-surprised.webp" },
];

// สีพื้นหลังของอวาตาร์แบบตัวอักษร ("initial")
export const AVATAR_COLORS = ["#287fc2", "#0c8f6f", "#d9731f", "#8b5fd0", "#d0457b", "#4a6fa5", "#b8860b", "#5b6b7a"];

// พื้นหลัง (ปก) หลังการ์ดโปรไฟล์ preset แบบ `image` ใช้ไฟล์ใน
// /public ส่วนแบบ `gradient` เป็นพื้นหลัง CSS ล้วน
export const COVER_PRESETS = [
  { key: "banner", label: "เมืองยามเช้า", kind: "image", value: "/images/illustrations/banner.webp" },
  { key: "lesson-1", label: "ฟ้าใส", kind: "image", value: "/images/lessons/cover-1.png" },
  { key: "lesson-2", label: "ทุ่งสีเขียว", kind: "image", value: "/images/lessons/cover-2.png" },
  { key: "lesson-3", label: "อบอุ่น", kind: "image", value: "/images/lessons/cover-3.png" },
  { key: "lesson-4", label: "ยามเย็น", kind: "image", value: "/images/lessons/cover-4.png" },
  { key: "sunrise", label: "รุ่งอรุณ", kind: "gradient", value: "linear-gradient(135deg, #ffd6a5 0%, #ffadad 100%)" },
  { key: "ocean", label: "มหาสมุทร", kind: "gradient", value: "linear-gradient(135deg, #7cc6f4 0%, #287fc2 100%)" },
  { key: "forest", label: "ป่าเขียว", kind: "gradient", value: "linear-gradient(135deg, #b5ead7 0%, #3fa37f 100%)" },
  { key: "lavender", label: "ลาเวนเดอร์", kind: "gradient", value: "linear-gradient(135deg, #d4c5f9 0%, #8b7fd6 100%)" },
  { key: "peach", label: "พีช", kind: "gradient", value: "linear-gradient(135deg, #ffe3d1 0%, #f2a071 100%)" },
  { key: "midnight", label: "ราตรี", kind: "gradient", value: "linear-gradient(135deg, #3a5a8c 0%, #1b2a49 100%)" },
];

export const AVATAR_PRESET_KEYS = AVATAR_PRESETS.map((preset) => preset.key);
export const COVER_PRESET_KEYS = COVER_PRESETS.map((preset) => preset.key);
export const DEFAULT_COVER_PRESET = "banner";
