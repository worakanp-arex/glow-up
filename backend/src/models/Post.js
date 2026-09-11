import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    tags: { type: [String], default: [] },
    commentsEnabled: { type: Boolean, default: true },
    // Set when a user flags the post's content (e.g. health-related claims)
    // for staff review — cleared once a counsellor/admin has reviewed it.
    needsReview: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
