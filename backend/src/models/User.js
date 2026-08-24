import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: {
      type: String,
      required: function requiredUnlessGoogleAccount() {
        return !this.googleId;
      },
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: ["user", "employer", "admin", "counsellor"], default: "user" },
    phone: { type: String },
    age: { type: Number },
    gender: { type: String },
    address: { type: String },
    education: { type: String },
    experience: { type: String },
    companyName: { type: String },
    businessType: { type: String },
    taxId: { type: String },
    specialization: { type: String },
    hospital: { type: String },
    verifiedStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    avatarUrl: { type: String },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
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

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
