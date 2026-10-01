import mongoose from "mongoose";

// Admin-managed catalog of ActivityMission categories (replaces the old
// hardcoded 8-category enum). `key` is the stable identifier stored on
// ActivityMission/ActivityMissionLog documents and must never change once
// missions reference it — only `label`/`icon`/`order` are editable.
const missionCategorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    icon: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("MissionCategory", missionCategorySchema);
