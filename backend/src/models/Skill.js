import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true },
    category: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Skill", skillSchema);
