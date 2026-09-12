import "./config/env.js";
import express from "express";
import path from "node:path";
import { verifyToken } from "./middleware/authMiddleware.js";
import { authorizeDownload } from "./middleware/authorizeDownload.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { UPLOAD_ROOT } from "./middleware/upload.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import jobCategoryRoutes from "./routes/jobCategoryRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import emotionRoutes from "./routes/emotionRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import overviewRoutes from "./routes/overviewRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import counsellingRoutes from "./routes/counsellingRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import missionRoutes from "./routes/missionRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import familyRoutes from "./routes/familyRoutes.js";
import weeklyCheckInRoutes from "./routes/weeklyCheckInRoutes.js";
import microLessonRoutes from "./routes/microLessonRoutes.js";
import scenarioRoutes from "./routes/scenarioRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use("/uploads/avatars", (req, res, next) => {
  if (!/\.(png|jpe?g|webp)$/i.test(req.path)) return res.sendStatus(404);
  next();
}, express.static(path.join(UPLOAD_ROOT, "avatars")));
app.get("/uploads/:kind/:filename", verifyToken, asyncHandler(authorizeDownload), (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.download(path.join(UPLOAD_ROOT, req.params.kind, req.params.filename), (err) => {
    if (err) next(err);
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/job-categories", jobCategoryRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/emotion", emotionRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/counselling", counsellingRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/weekly-checkins", weeklyCheckInRoutes);
app.use("/api/micro-lessons", microLessonRoutes);
app.use("/api/scenarios", scenarioRoutes);

app.use(errorHandler);

export default app;
