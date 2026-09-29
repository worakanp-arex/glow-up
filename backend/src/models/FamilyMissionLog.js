import mongoose from "mongoose";

// One attempt of a joint family mission on a given day — completed only once
// both the recovering user and the linked family member have confirmed it.
const familyMissionLogSchema = new mongoose.Schema(
  {
    familyLink: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyLink", required: true },
    // Denormalized from familyLink.recoveringUser so getTotalPoints() can sum
    // this user's completed family-mission points with a single indexed
    // query, the same shape as its other point sources, instead of a
    // FamilyLink lookup on every points computation.
    recoveringUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    familyMission: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMission", required: true },
    dateKey: { type: String, required: true },
    userConfirmed: { type: Boolean, default: false },
    userConfirmedAt: { type: Date },
    familyConfirmed: { type: Boolean, default: false },
    familyConfirmedAt: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

familyMissionLogSchema.index({ familyLink: 1, familyMission: 1, dateKey: 1 }, { unique: true });
familyMissionLogSchema.index({ recoveringUser: 1, completed: 1 });

export default mongoose.model("FamilyMissionLog", familyMissionLogSchema);
