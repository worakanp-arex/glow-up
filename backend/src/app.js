import "./config/env.js";
import express from "express";
import path from "node:path";
import { verifyToken } from "./middleware/authMiddleware.js";
import { authorizeDownload } from "./middleware/authorizeDownload.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import { sanitizeMongoOperators } from "./middleware/sanitizeMongoOperators.js";
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
import activityMissionRoutes from "./routes/activityMissionRoutes.js";
import missionCategoryRoutes from "./routes/missionCategoryRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import familyRoutes from "./routes/familyRoutes.js";
import weeklyCheckInRoutes from "./routes/weeklyCheckInRoutes.js";
import microLessonRoutes from "./routes/microLessonRoutes.js";
import scenarioRoutes from "./routes/scenarioRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import riskSituationRoutes from "./routes/riskSituationRoutes.js";
import careerRoutes from "./routes/careerRoutes.js";
import familyMissionRoutes from "./routes/familyMissionRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Behind a reverse proxy (e.g. Nginx on the same machine) set TRUST_PROXY=loopback
// so rate limiting sees each visitor's real IP instead of the proxy's.
// Accepts true/false, a hop count (e.g. 1) or names/IPs like "loopback".
export function parseTrustProxy(value) {
  const v = String(value).trim();
  if (/^(true|yes)$/i.test(v)) return true;
  if (/^(false|no)$/i.test(v)) return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
}

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(sanitizeMongoOperators);

// Optional single-service hosting: set FRONTEND_DIST to the built frontend
// (e.g. ../frontend/dist) and this server also serves the web app. The page
// itself skips helmet's CSP because Google Sign-In and Google Fonts load
// third-party scripts, frames and styles; API responses keep the full helmet set.
if (process.env.FRONTEND_DIST) {
  const distDir = path.resolve(process.cwd(), process.env.FRONTEND_DIST);
  const isBackendPath = (p) => p.startsWith("/api") || p.startsWith("/uploads") || p.startsWith("/socket.io");
  const pageHeaders = helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" } });
  app.use((req, res, next) => (isBackendPath(req.path) ? next() : pageHeaders(req, res, next)));
  const serveStatic = express.static(distDir, { index: false });
  app.use((req, res, next) => (isBackendPath(req.path) ? next() : serveStatic(req, res, next)));
  app.get(/^(?!\/(api|uploads|socket\.io)(\/|$)).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use(helmet());
// Avatars, course covers and job images are intentionally public and rendered
// cross-origin by the frontend; helmet's default same-origin CORP would
// silently break that <img> loading, so relax it for these routes only.
for (const [route, folder] of [["avatars", "avatars"], ["course-covers", "course-covers"], ["job-images", "job-images"]]) {
  app.use(`/uploads/${route}`, (req, res, next) => {
    if (!/\.(png|jpe?g|webp)$/i.test(req.path)) return res.sendStatus(404);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  }, express.static(path.join(UPLOAD_ROOT, folder)));
}
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
app.use("/api/activity-missions", activityMissionRoutes);
app.use("/api/mission-categories", missionCategoryRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/weekly-checkins", weeklyCheckInRoutes);
app.use("/api/micro-lessons", microLessonRoutes);
app.use("/api/scenarios", scenarioRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/risk-situations", riskSituationRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/family-missions", familyMissionRoutes);

app.use(errorHandler);

export default app;
