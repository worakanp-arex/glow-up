import mongoose from "mongoose";

const familyLinkSchema = new mongoose.Schema(
  {
    // The person in recovery whose progress the family member follows.
    recoveringUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Set once the invite is accepted; null while pending.
    familyUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Who started the connection. "recovering" = the patient invited a family
    // member by email; "family" = the family member asked to follow the patient
    // and the patient has to approve (status "requested").
    initiatedBy: { type: String, enum: ["recovering", "family"], default: "recovering" },
    // For patient invites this is the invitee's email; for family requests it is
    // the requester's own email.
    inviteEmail: { type: String, required: true },
    inviteTokenHash: {
      type: String,
      required: function requiredForInvites() {
        return this.initiatedBy !== "family";
      },
      select: false,
    },
    inviteExpiresAt: {
      type: Date,
      required: function requiredForInvites() {
        return this.initiatedBy !== "family";
      },
    },
    status: { type: String, enum: ["pending", "requested", "active", "revoked"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyLink", familyLinkSchema);
