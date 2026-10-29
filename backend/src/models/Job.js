import mongoose from "mongoose";
import { ATTACHMENT_TYPES } from "../constants/attachmentTypes.js";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    // employer ต้องเป็น User ที่มีบทบาท "employer"
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // link to the real external application page (company site / JobsDB) to avoid
    // falling under the recruitment-agency licensing law (พ.ร.บ.จัดหางาน)
    externalUrl: { type: String },
    location: { type: String },
    salary: { type: Number },
    status: { type: String, enum: ["open", "closed", "expired"], default: "open" },
    // ด่านตรวจสอบโดยแอดมิน แยกจากวงจรสถานะ `status` ด้านบน
    verifiedStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    expiredAt: { type: Date },
    // รูปบริษัท/งานที่แสดงในรายการ (อัปโหลดแบบสาธารณะ, /uploads/job-images/...)
    imageUrl: { type: String },
    // แอดมินตั้งค่าเมื่อประกาศถูกปฏิเสธ เพื่อให้นายจ้างรู้เหตุผล
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "JobCategory" },
    // เอกสารที่นายจ้างต้องการให้ผู้สมัครแนบ นอกเหนือจากเรซูเม่/เกียรติบัตรในโปรไฟล์
    attachmentRequests: { type: [String], enum: ATTACHMENT_TYPES, default: [] },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, verifiedStatus: 1 });

export default mongoose.model("Job", jobSchema);
