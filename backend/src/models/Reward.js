import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    // คะแนนภารกิจสะสมที่ต้องใช้เพื่อปลดล็อกระดับรางวัลนี้
    pointsRequired: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Reward", rewardSchema);
