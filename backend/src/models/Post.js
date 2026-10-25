import mongoose from "mongoose";
import { REPORT_REASON_VALUES } from "../constants/reportReasons.js";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    tags: { type: [String], default: [] },
    commentsEnabled: { type: Boolean, default: true },
    // Which roles can see this post — set by the staff author. Empty means
    // visible to everyone; staff (admin/counsellor) always see every post
    // regardless of this field, for moderation.
    visibleToRoles: { type: [String], enum: ["user", "family", "employer"], default: [] },
    // Set when a user reports the post's content. A reported post is hidden
    // from non-staff until a counsellor/admin resolves it (keeps it, edits it
    // or deletes it); resolving clears the reports and notifies the reporters.
    needsReview: { type: Boolean, default: false },
    reports: [
      {
        reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, enum: REPORT_REASON_VALUES, default: "other" },
        detail: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Most recent moderation outcome, kept for audit after reports are cleared.
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
