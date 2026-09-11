import mongoose from "mongoose";

const weeklyCheckInSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // ISO week, e.g. "2026-W37" — one submission per user per week.
    isoWeekKey: { type: String, required: true },
    stressLevel: { type: Number, min: 1, max: 5, required: true },
    moodTrend: { type: String, enum: ["improving", "stable", "worsening"], required: true },
    selfHarmRiskFlag: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

weeklyCheckInSchema.index({ user: 1, isoWeekKey: 1 }, { unique: true });

export default mongoose.model("WeeklyCheckIn", weeklyCheckInSchema);
