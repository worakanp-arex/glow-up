import mongoose from "mongoose";

const jobCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("JobCategory", jobCategorySchema);
