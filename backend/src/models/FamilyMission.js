import mongoose from "mongoose";

// Catalog of joint missions a recovering user and their linked family member
// can do together — separate from the solo Mission/ActivityMission catalogs
// because completing one requires confirmation from both sides.
const familyMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    points: { type: Number, default: 10 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyMission", familyMissionSchema);
