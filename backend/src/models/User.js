import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "../utils/passwordPolicy.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nickname: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: {
      type: String,
      required: function requiredUnlessGoogleAccount() {
        return !this.googleId;
      },
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: ["user", "family", "employer", "admin", "counsellor"], default: "user" },
    phone: { type: String },
    age: { type: Number },
    gender: { type: String },
    address: { type: String },
    province: { type: String },
    bio: { type: String },
    education: { type: String },
    experience: { type: String },
    companyName: { type: String },
    businessType: { type: String },
    taxId: { type: String },
    specialization: { type: String },
    hospital: { type: String },
    verifiedStatus: { type: String, enum: ["pending", "verified", "rejected", "suspended"], default: "pending" },
    // ผู้ให้คำปรึกษาที่รับผิดชอบการดูแลผู้ใช้รายนี้ (เฉพาะบทบาท "user")
    // ตั้งอัตโนมัติเมื่อผู้ให้คำปรึกษารับ session ของผู้ใช้เป็นครั้งแรก
    // และเป็นตัวกำหนดว่าผู้ให้คำปรึกษาคนไหนดูโปรไฟล์
    // ทางคลินิกฉบับเต็มได้ (ดู utils/patientAccess.js)
    assignedCounsellor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    avatarUrl: { type: String },
    // "initial" แสดงตัวอักษรสีแทน avatarUrl / ภาพประจำบทบาท
    avatarStyle: { type: String, enum: ["image", "initial"], default: "image" },
    avatarColor: { type: String },
    // คีย์ของ COVER_PRESETS ใน constants/profileArt.js (พื้นหลังหลังการ์ดโปรไฟล์)
    coverPreset: { type: String },
    // ข้อมูลนายจ้าง
    website: { type: String },
    companySize: { type: String },
    companyDescription: { type: String },
    contactPosition: { type: String },
    // ข้อมูลแอดมิน
    position: { type: String },
    department: { type: String },
    // ชื่อที่ผู้ป่วยตั้งให้กลุ่มครอบครัวของตน (เฉพาะบทบาท "user")
    familyName: { type: String },
    // เหตุผลที่แอดมินปฏิเสธหรือระงับบัญชี (แสดงให้เจ้าของบัญชีเห็น)
    verificationNote: { type: String },
    // สิ่งที่ผู้ติดตามในครอบครัวที่เชื่อมต่ออยู่เห็นได้ (เฉพาะบทบาท "user")
    // เปิดทั้งคู่เป็นค่าเริ่มต้น เพื่อให้ลิงก์ที่สร้างก่อนมีการตั้งค่านี้ทำงานเหมือนเดิม
    familySharing: {
      progress: { type: Boolean, default: true },
      missions: { type: Boolean, default: true },
    },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // token ล็อกอินทุกตัวที่ออกก่อนเวลานี้จะถูกปฏิเสธ (ดู
    // middleware/authMiddleware.js) ดังนั้นการเปลี่ยนหรือรีเซ็ตรหัสผ่าน
    // จะออกจากระบบทุกเซสชันที่อาจมีคนอื่นถืออยู่
    passwordChangedAt: { type: Date, select: false },
    // Soft delete บัญชีที่ถูกลบจะมองไม่เห็นในทั้งแอป (ล็อกอินไม่ได้ ไม่มีใครค้นเจอ
    // ไม่มีอีเมลหรือการเตือนไปถึง) แต่ข้อมูลถูกเก็บไว้ RETENTION_DAYS วัน
    // เพื่อให้แอดมินตรวจสอบหรือกู้คืนได้ หลังจากนั้นจะถูกทำให้
    // ไม่ระบุตัวตน (services/accountLifecycleService.js) เฉพาะโค้ดที่ส่งตัวเลือก
    // `withDeleted` หรือกรองด้วย `deletedAt` เองเท่านั้นที่เห็นบัญชีเหล่านี้
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletionReason: { type: String },
    anonymizedAt: { type: Date },
    pdpaConsent: { type: Boolean, required: true },
    pdpaConsentAt: { type: Date },
    resumeUrl: { type: String },
    certificates: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ deletedAt: 1 });

// การค้นหาผู้ใช้ทั่วไปทุกครั้งจะไม่รวมบัญชีที่ถูกลบ ทำที่นี่ครั้งเดียว
// แทนการทำในทุก query ทำให้ไม่มีเส้นทางโค้ดใด (งานเตือน การแจ้งเตือน
// รายการ หรือ populate) ลืมแล้วไปถึงคนที่ถูกลบได้
const QUERIES_THAT_HIDE_DELETED_USERS = [
  "find", "findOne", "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete",
  "updateOne", "updateMany", "countDocuments", "distinct",
];
userSchema.pre(QUERIES_THAT_HIDE_DELETED_USERS, function hideDeletedUsers() {
  if (this.getOptions().withDeleted) return;
  // query ที่ระบุ `deletedAt` เอง (หน้าจอบัญชีที่ถูกลบของแอดมิน) ตั้งใจขอบัญชีที่ถูกลบ
  if (this.getFilter().deletedAt !== undefined) return;
  this.where({ deletedAt: null });
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  // การเปลี่ยนรหัสผ่านของบัญชีที่มีอยู่จะสิ้นสุดทุกเซสชันที่เก่ากว่า
  if (!this.isNew) this.passwordChangedAt = new Date();
  if (this.$locals.passwordAlreadyHashed) {
    delete this.$locals.passwordAlreadyHashed;
    return next();
  }
  this.password = await bcrypt.hash(this.password, BCRYPT_COST);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
