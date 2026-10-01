import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
    // Which counsellor is responsible for this user's care (role "user" only).
    // Set automatically the first time a counsellor claims one of their
    // counselling sessions; gates which counsellor can view their full
    // clinical profile (see utils/patientAccess.js).
    assignedCounsellor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    avatarUrl: { type: String },
    // What an active family follower may see (role "user" only). Both default
    // on so links created before this setting existed keep behaving the same.
    familySharing: {
      progress: { type: Boolean, default: true },
      missions: { type: Boolean, default: true },
    },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
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

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  if (this.$locals.passwordAlreadyHashed) {
    delete this.$locals.passwordAlreadyHashed;
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
