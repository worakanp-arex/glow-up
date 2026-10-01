import mongoose from "mongoose";

const activityMissionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activityMission: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityMission", required: true },
    // Denormalized from ActivityMission.category at log time (see MissionCategory).
    category: { type: String, required: true },
    dateKey: { type: String, required: true },
    durationMinutes: { type: Number },
    distanceKm: { type: Number },
    fatigueLevel: { type: Number, min: 1, max: 5 },
    enjoymentLevel: { type: Number, min: 1, max: 5 },
    note: { type: String },
    pointsAwarded: { type: Number, required: true },
    // Denormalized from ActivityMission.requiresApproval at log time.
    requiresApproval: { type: Boolean, default: false },
    // null = pending review, true = approved (counts toward points), false = rejected.
    approved: { type: Boolean, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

activityMissionLogSchema.index({ user: 1, activityMission: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("ActivityMissionLog", activityMissionLogSchema);
