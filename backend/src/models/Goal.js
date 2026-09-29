import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    term: { type: String, enum: ["short", "long"], required: true },
    targetDate: { type: Date },
    status: { type: String, enum: ["active", "completed", "abandoned"], default: "active" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);
