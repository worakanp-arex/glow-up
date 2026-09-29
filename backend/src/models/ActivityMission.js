import mongoose from "mongoose";

const activityMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["routine", "physical", "learning", "self_awareness", "coping", "self_monitoring", "social", "mindfulness"],
      required: true,
    },
    icon: { type: String },
    points: { type: Number, default: 5 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityMission", activityMissionSchema);
