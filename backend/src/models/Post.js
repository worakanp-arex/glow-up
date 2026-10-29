import mongoose from "mongoose";
import { REPORT_REASON_VALUES } from "../constants/reportReasons.js";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    tags: { type: [String], default: [] },
    commentsEnabled: { type: Boolean, default: true },
    // บทบาทที่เห็นโพสต์นี้ — กำหนดโดยเจ้าหน้าที่ผู้เขียน ถ้าว่างหมายถึง
    // ทุกคนเห็น เจ้าหน้าที่ (แอดมิน/ผู้ให้คำปรึกษา) เห็นทุกโพสต์เสมอ
    // ไม่ว่าฟิลด์นี้เป็นอย่างไร เพื่อการกลั่นกรอง
    visibleToRoles: { type: [String], enum: ["user", "family", "employer"], default: [] },
    // ตั้งค่าเมื่อผู้ใช้รายงานเนื้อหาของโพสต์ โพสต์ที่ถูกรายงานจะถูกซ่อน
    // จากคนที่ไม่ใช่เจ้าหน้าที่จนกว่าผู้ให้คำปรึกษา/แอดมินจะจัดการ (เก็บไว้ แก้ไข
    // หรือลบ) การจัดการจะล้างรายงานและแจ้งผู้รายงาน
    needsReview: { type: Boolean, default: false },
    reports: [
      {
        reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, enum: REPORT_REASON_VALUES, default: "other" },
        detail: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // ผลการกลั่นกรองล่าสุด เก็บไว้เป็นหลักฐานตรวจสอบหลังล้างรายงานแล้ว
    lastReview: {
      reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: { type: String, enum: ["kept", "edited"] },
      at: { type: Date },
      note: { type: String },
    },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export default mongoose.model("Post", postSchema);
