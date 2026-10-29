import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, index: true },
    // คีย์จาก SKILL_CATEGORIES ใน constants/skills.js (ข้อมูลเก่าอาจไม่มี)
    category: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Skill", skillSchema);
