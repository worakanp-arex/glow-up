import mongoose from "mongoose";

// Generic admin-configurable key/value store (e.g. "pointsPerLevel").
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
