import mongoose from "mongoose";

const counsellorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialization: { type: String },
    hospital: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Counsellor", counsellorSchema);
