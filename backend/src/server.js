import { validateEnvironment } from "./config/env.js";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socket.js";
import { sendCourseExpiryReminders } from "./services/courseReminderService.js";
import { ensureDefaultSkills } from "./services/skillCatalogService.js";

validateEnvironment();

const PORT = process.env.PORT || 5001;

const httpServer = http.createServer(app);
initSocket(httpServer, process.env.CORS_ORIGIN || "http://localhost:5173");

connectDB()
  .then(() => {
    // Adds any missing standard career skills; never edits existing ones.
    ensureDefaultSkills().catch((err) => console.error("Seeding default skills failed", err));
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    // Warn people about saved courses that are about to expire. Production runs
    // a single instance (see deploy/ecosystem.config.cjs), so an in-process
    // timer is enough; reminders are deduped per person, course and day.
    const remindAboutExpiringCourses = () => sendCourseExpiryReminders().catch((err) => console.error("Course expiry reminders failed", err));
    remindAboutExpiringCourses();
    setInterval(remindAboutExpiringCourses, 60 * 60 * 1000).unref();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
