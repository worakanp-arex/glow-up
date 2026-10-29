import mongoose from "mongoose";

const microLessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String },
    // เนื้อหานี้เขียนสำหรับใคร — ให้คู่มือครอบครัว/ผู้ดูแลใช้ระบบบทเรียน
    // เดียวกันได้ โดยไม่ปะปนกับรายการของผู้ฟื้นฟู
    audience: { type: String, enum: ["user", "family"], default: "user" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    // วันสุดท้ายที่แสดงบทเรียนให้สมาชิก ถ้าไม่ตั้งค่าแปลว่าไม่หมดอายุ
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("MicroLesson", microLessonSchema);
