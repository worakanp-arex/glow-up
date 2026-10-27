import mongoose from "mongoose";

// Who did what to whose data. Written when an account is deleted, restored or
// anonymised and whenever an admin opens a deleted account's records, so access
// to retained health data can always be explained afterwards. Entries are only
// ever added, never edited.
const auditLogSchema = new mongoose.Schema(
  {
    // null when the system acted on its own (the retention job).
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: {
      type: String,
      required: true,
      enum: ["account.deleted", "account.restored", "account.anonymized", "deleted-account.viewed"],
    },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
