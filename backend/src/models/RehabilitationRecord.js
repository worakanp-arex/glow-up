import mongoose from "mongoose";

const rehabilitationRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hospitalName: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["completed", "ongoing"] },
    verifiedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("RehabilitationRecord", rehabilitationRecordSchema);
