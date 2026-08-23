import mongoose from "mongoose";

const jobSkillSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("JobSkill", jobSkillSchema);
