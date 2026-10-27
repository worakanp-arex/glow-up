import { validateEnvironment } from "./config/env.js";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socket.js";
import { sendCourseExpiryReminders } from "./services/courseReminderService.js";
import { anonymizeExpiredUsers } from "./services/accountLifecycleService.js";
import { ensureDefaultSkills } from "./services/skillCatalogService.js";

validateEnvironment();

const PORT = process.env.PORT || 5001;
// Behind nginx, set HOST=127.0.0.1 so the API can't be reached directly from the
// network. Left unset it listens on every interface (needed on Railway and similar hosts).
const HOST = process.env.HOST;

const httpServer = http.createServer(app);
initSocket(httpServer, (process.env.CORS_ORIGIN || "http://localhost:5173").trim().replace(/\/+$/, ""));

connectDB()
  .then(() => {
    // Adds any missing standard career skills; never edits existing ones.
    ensureDefaultSkills().catch((err) => console.error("Seeding default skills failed", err));
    const onListening = () => console.log(`Server running on http://${HOST || "localhost"}:${PORT}`);
    if (HOST) httpServer.listen(PORT, HOST, onListening);
    else httpServer.listen(PORT, onListening);
    // Warn people about saved courses that are about to expire. Production runs
    // a single instance (see deploy/ecosystem.config.cjs), so an in-process
    // timer is enough; reminders are deduped per person, course and day.
    const remindAboutExpiringCourses = () => sendCourseExpiryReminders().catch((err) => console.error("Course expiry reminders failed", err));
    remindAboutExpiringCourses();
    setInterval(remindAboutExpiringCourses, 60 * 60 * 1000).unref();
    // Deleted accounts are kept for RETENTION_DAYS and then anonymised for good. The job
    // can safely run any number of times: it only touches accounts whose time is up.
    const anonymizeDeletedAccounts = () =>
      anonymizeExpiredUsers()
        .then((count) => count > 0 && console.log(`Anonymised ${count} deleted account(s)`))
        .catch((err) => console.error("Anonymising deleted accounts failed", err));
    anonymizeDeletedAccounts();
    setInterval(anonymizeDeletedAccounts, 6 * 60 * 60 * 1000).unref();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
