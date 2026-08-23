import mongoose from "mongoose";

const userSkillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
    level: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

export default mongoose.model("UserSkill", userSkillSchema);
