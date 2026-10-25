import mongoose from "mongoose";

// A short message between a recovering user and the family member they are
// actively linked to. Both sides can send; history stays on the link even
// after the notification that announced it has been cleared or expired.
const familyMessageSchema = new mongoose.Schema(
  {
    familyLink: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyLink", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // "family" = the follower, "user" = the person in recovery.
    senderRole: { type: String, enum: ["family", "user"], required: true },
    content: { type: String, required: true, maxlength: 500 },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMessage" },
    // Set when the other party opened/acknowledged it.
    readAt: { type: Date },
  },
  { timestamps: true }
);

familyMessageSchema.index({ familyLink: 1, createdAt: -1 });

export default mongoose.model("FamilyMessage", familyMessageSchema);
