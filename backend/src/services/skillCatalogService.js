import Skill from "../models/Skill.js";
import { DEFAULT_SKILLS } from "../constants/skills.js";

// ทำให้แน่ใจว่าแคตตาล็อกทักษะอาชีพมาตรฐานมีอยู่ รันได้อย่างปลอดภัยทุกครั้งที่เริ่มระบบ:
// เพิ่มเฉพาะทักษะที่ขาด (จับคู่ตามชื่อ) และเติมหมวดหมู่
// ให้ข้อมูลเก่าที่ไม่มี — ไม่แก้ไขหรือลบสิ่งที่แอดมินเปลี่ยน
export async function ensureDefaultSkills() {
  const existing = await Skill.find().select("skillName category");
  const byName = new Map(existing.map((skill) => [skill.skillName, skill]));

  const missing = [];
  let categorised = 0;
  for (const [category, names] of Object.entries(DEFAULT_SKILLS)) {
    for (const skillName of names) {
      const current = byName.get(skillName);
      if (!current) {
        missing.push({ skillName, category });
      } else if (!current.category) {
        await Skill.updateOne({ _id: current._id }, { category });
        categorised += 1;
      }
    }
  }
  if (missing.length > 0) await Skill.insertMany(missing);
  return { added: missing.length, categorised };
}
