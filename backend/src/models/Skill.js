import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, index: true },
    // Key from constants/skills.js SKILL_CATEGORIES (older records may have none).
    category: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Skill", skillSchema);
