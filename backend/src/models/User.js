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
    // Which counsellor is responsible for this user's care (role "user" only).
    // Set automatically the first time a counsellor claims one of their
    // counselling sessions; gates which counsellor can view their full
    // clinical profile (see utils/patientAccess.js).
    assignedCounsellor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    avatarUrl: { type: String },
    // "initial" shows a coloured letter instead of avatarUrl / the role artwork.
    avatarStyle: { type: String, enum: ["image", "initial"], default: "image" },
    avatarColor: { type: String },
    // Key into constants/profileArt.js COVER_PRESETS (background behind the profile card).
    coverPreset: { type: String },
    // Employer details
    website: { type: String },
    companySize: { type: String },
    companyDescription: { type: String },
    contactPosition: { type: String },
    // Admin details
    position: { type: String },
    department: { type: String },
    // Name the patient gives their family circle (role "user" only).
    familyName: { type: String },
    // Why an admin rejected or suspended the account (shown to the owner).
    verificationNote: { type: String },
    // What an active family follower may see (role "user" only). Both default
    // on so links created before this setting existed keep behaving the same.
    familySharing: {
      progress: { type: Boolean, default: true },
      missions: { type: Boolean, default: true },
    },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // Every login token issued before this moment is refused (see
    // middleware/authMiddleware.js), so changing or resetting the password
    // signs out whoever else might be holding a session.
    passwordChangedAt: { type: Date, select: false },
    // Soft delete. A deleted account is invisible to the whole app (it cannot sign
    // in, nobody can look it up, no email or reminder reaches it) but its data is
    // kept for RETENTION_DAYS so an admin can review or restore it; after that it
    // is anonymised (services/accountLifecycleService.js). Only code that passes
    // the `withDeleted` option, or filters on `deletedAt` itself, can see these.
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

// Every ordinary lookup of users leaves out deleted accounts. Doing it here, once,
// instead of in each query means no code path (a reminder job, a notification, a
// list, a populate) can forget to and reach a deleted person.
const QUERIES_THAT_HIDE_DELETED_USERS = [
  "find", "findOne", "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete",
  "updateOne", "updateMany", "countDocuments", "distinct",
];
userSchema.pre(QUERIES_THAT_HIDE_DELETED_USERS, function hideDeletedUsers() {
  if (this.getOptions().withDeleted) return;
  // A query that names `deletedAt` itself (the admin's deleted-accounts screens) is asking on purpose.
  if (this.getFilter().deletedAt !== undefined) return;
  this.where({ deletedAt: null });
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  // A password replaced on an existing account ends every older session.
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
