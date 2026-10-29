import { isProductionLike } from "./config/env.js";
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
import { PAGE_CSP_DIRECTIVES } from "./config/csp.js";
import { requireOwnOrigin } from "./middleware/originCheck.js";
import { apiLimiter, apiWriteLimiter, uploadLimiter } from "./middleware/rateLimiters.js";
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

// เมื่ออยู่หลัง reverse proxy (เช่น Nginx บนเครื่องเดียวกัน) ให้ตั้ง TRUST_PROXY=loopback
// เพื่อให้ rate limit เห็น IP จริงของผู้เข้าชมแทน IP ของ proxy
// รับค่า true/false จำนวน hop (เช่น 1) หรือชื่อ/IP เช่น "loopback"
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

// บังคับใช้ HTTPS เป็นเวลา 1 ปี เฉพาะโฮสต์นี้เท่านั้น: นโยบายต้องไม่ลามไปยัง
// ซับโดเมนอื่นของโดเมนนี้ ซึ่งแอปนี้ไม่ได้ควบคุม
const HSTS = { maxAge: 31536000, includeSubDomains: false };
// origin ไม่มีทางลงท้ายด้วย "/" จึงรองรับกรณีที่วางค่ามามีเครื่องหมาย / ต่อท้ายหรือมีช่องว่างเกินในการตั้งค่า
const allowedOrigin = (process.env.CORS_ORIGIN || "http://localhost:5173").trim().replace(/\/+$/, "");
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// log ของ production ระบุว่าใครเรียก path ไหนและผลเป็นอย่างไร พร้อมเวลา
// โดยไม่เก็บ query string (เพราะอาจมีคำค้นหาหรือรหัสอ้างอิง)
morgan.token("path", (req) => req.originalUrl.split("?")[0]);
app.use(morgan(isProductionLike() ? ":date[iso] :remote-addr :method :path :status :res[content-length] :response-time ms" : "dev"));
app.use(sanitizeMongoOperators);

// โหมดโฮสต์บริการเดียว (ไม่บังคับ): ตั้ง FRONTEND_DIST ชี้ไปยัง frontend ที่ build แล้ว
// (เช่น ../frontend/dist) เซิร์ฟเวอร์นี้จะให้บริการเว็บแอปด้วย หน้าเว็บจะมี
// Content-Security-Policy ของตัวเอง (config/csp.js) ที่อนุญาตเฉพาะสคริปต์ เฟรม และสไตล์ของ Google Sign-In
// และไม่อนุญาตบุคคลที่สามอื่น ส่วน response ของ API ใช้ค่าเริ่มต้นของ helmet
if (process.env.FRONTEND_DIST) {
  const distDir = path.resolve(process.cwd(), process.env.FRONTEND_DIST);
  const isBackendPath = (p) => p.startsWith("/api") || p.startsWith("/uploads") || p.startsWith("/socket.io");
  const pageHeaders = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: PAGE_CSP_DIRECTIVES },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    strictTransportSecurity: HSTS,
  });
  app.use((req, res, next) => (isBackendPath(req.path) ? next() : pageHeaders(req, res, next)));
  const serveStatic = express.static(distDir, { index: false });
  app.use((req, res, next) => (isBackendPath(req.path) ? next() : serveStatic(req, res, next)));
  app.get(/^(?!\/(api|uploads|socket\.io)(\/|$)).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use(helmet({ strictTransportSecurity: HSTS }));
// รูปโปรไฟล์ ปกคอร์ส และรูปงานตั้งใจให้เป็นสาธารณะและถูกแสดงข้ามโดเมนโดย frontend
// ค่า CORP แบบ same-origin ตามค่าเริ่มต้นของ helmet จะทำให้การโหลด <img> พังโดยไม่แจ้งเตือน
// จึงผ่อนปรนเฉพาะ route เหล่านี้
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

app.use("/api", requireOwnOrigin(allowedOrigin), apiLimiter, apiWriteLimiter, uploadLimiter);

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
