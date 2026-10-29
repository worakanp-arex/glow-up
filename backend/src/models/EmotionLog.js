import mongoose from "mongoose";

const emotionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    happinessLevel: { type: Number, min: 1, max: 7, required: true },
    cravingLevel: { type: Number, min: 1, max: 10 },
    context: { type: String, enum: ["work", "family", "environment", "other"] },
    note: { type: String },
    date: { type: Date, default: Date.now },
    // วันตามปฏิทิน Asia/Bangkok (YYYY-MM-DD) ที่รายการนี้เป็นของ — บังคับ
    // หนึ่งรายการต่อผู้ใช้ต่อวัน การส่งซ้ำในวันเดียวกันจะอัปเดตรายการเดิม
    dateKey: { type: String, required: true },
  },
  { timestamps: true }
);

emotionLogSchema.index({ user: 1, dateKey: 1 }, { unique: true });

emotionLogSchema.index({ user: 1, date: -1 });

export default mongoose.model("EmotionLog", emotionLogSchema);
