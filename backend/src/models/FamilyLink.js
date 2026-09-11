import mongoose from "mongoose";

const familyLinkSchema = new mongoose.Schema(
  {
    // The person in recovery whose progress the family member follows.
    recoveringUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Set once the invite is accepted; null while pending.
    familyUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inviteEmail: { type: String, required: true },
    inviteTokenHash: { type: String, required: true, select: false },
    inviteExpiresAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "active", "revoked"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyLink", familyLinkSchema);
