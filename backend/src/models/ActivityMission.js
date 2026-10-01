import mongoose from "mongoose";

const activityMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    // References MissionCategory.key — validated against the admin-managed
    // catalog at the route layer (see activityMissionRoutes.js) rather than a
    // hardcoded Mongoose enum, since admins can add/rename categories.
    category: { type: String, required: true },
    icon: { type: String },
    points: { type: Number, default: 5 },
    // When true, a counsellor/admin must approve each day's log before its
    // points count toward the user's total (see ActivityMissionLog.approved).
    requiresApproval: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityMission", activityMissionSchema);
