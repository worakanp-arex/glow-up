import mongoose from "mongoose";

const userMissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mission: { type: mongoose.Schema.Types.ObjectId, ref: "Mission", required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

userMissionSchema.index({ user: 1, mission: 1 }, { unique: true });

export default mongoose.model("UserMission", userMissionSchema);
