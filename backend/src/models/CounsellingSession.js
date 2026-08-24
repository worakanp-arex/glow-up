import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["user", "counsellor"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const counsellingSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    sessionType: { type: String, enum: ["chat", "hotline", "video"], required: true },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    mood: {
      type: String,
      enum: ["sad", "very_sad", "anxious", "panic", "overthinking", "angry", "stressed", "numb", "other"],
      required: true,
    },
    preferredAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending", "active", "scheduled", "closed", "cancelled"],
      default: "pending",
    },

    scheduledAt: { type: Date },
    meetingLink: { type: String },
    meetingPlatform: {
      type: String,
      enum: ["zoom", "google-meet", "teams", "line", "other"],
    },

    messages: [messageSchema],
  },
  { timestamps: true }
);

counsellingSessionSchema.index({ counsellor: 1, scheduledAt: 1 });

export default mongoose.model("CounsellingSession", counsellingSessionSchema);
