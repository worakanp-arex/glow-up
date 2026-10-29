import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    externalUrl: { type: String, required: true },
    // ลิงก์คอร์สภายนอกมีวันหมดอายุ วันที่ทั้งสองไม่บังคับ `endDate` คือ
    // ช่วงเวลาสุดท้าย (สิ้นวันตามเวลาไทย) ที่ยังเรียนคอร์สนี้ได้
    startDate: { type: Date },
    endDate: { type: Date },
    // เป็นพาธรูปที่มีมาในระบบ (/images/...) หรือรูปที่อัปโหลด (/uploads/course-covers/...)
    coverImage: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
