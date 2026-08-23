import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    category: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
