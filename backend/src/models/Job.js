import mongoose from "mongoose";
import { ATTACHMENT_TYPES } from "../constants/attachmentTypes.js";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    // employer must be a User with role "employer"
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // link to the real external application page (company site / JobsDB) to avoid
    // falling under the recruitment-agency licensing law (พ.ร.บ.จัดหางาน)
    externalUrl: { type: String },
    location: { type: String },
    salary: { type: Number },
    status: { type: String, enum: ["open", "closed", "expired"], default: "open" },
    // admin moderation gate, separate from the operational `status` lifecycle above
    verifiedStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    expiredAt: { type: Date },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "JobCategory" },
    // documents the employer wants applicants to attach on top of the profile resume/certificates
    attachmentRequests: { type: [String], enum: ATTACHMENT_TYPES, default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
