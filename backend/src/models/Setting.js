import mongoose from "mongoose";

// ที่เก็บคีย์/ค่าทั่วไปที่แอดมินตั้งค่าได้ (เช่น "pointsPerLevel")
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
