import mongoose from "mongoose";

// แคตตาล็อกหมวดหมู่ ActivityMission ที่แอดมินจัดการ (แทน enum 8 หมวดที่ฮาร์ดโค้ดเดิม)
// `key` คือตัวระบุคงที่ที่เก็บในเอกสาร
// ActivityMission/ActivityMissionLog และห้ามเปลี่ยนเมื่อมีภารกิจ
// อ้างอิงแล้ว — แก้ได้เฉพาะ `label`/`icon`/`order`
const missionCategorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    icon: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("MissionCategory", missionCategorySchema);
