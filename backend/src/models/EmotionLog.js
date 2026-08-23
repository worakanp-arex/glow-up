import mongoose from "mongoose";

const emotionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    happinessLevel: { type: Number, min: 1, max: 7, required: true },
    cravingLevel: { type: Number, min: 1, max: 10 },
    context: { type: String, enum: ["work", "family", "environment", "other"] },
    note: { type: String },
    date: { type: Date, default: Date.now },
    // Asia/Bangkok calendar day (YYYY-MM-DD) this entry belongs to — enforces
    // one entry per user per day; re-submitting the same day updates it instead.
    dateKey: { type: String, required: true },
  },
  { timestamps: true }
);

emotionLogSchema.index({ user: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("EmotionLog", emotionLogSchema);
