import { validateEnvironment } from "./config/env.js";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socket.js";
import { sendCourseExpiryReminders } from "./services/courseReminderService.js";
import { sendContentExpiryReminders } from "./services/contentReminderService.js";
import { anonymizeExpiredUsers } from "./services/accountLifecycleService.js";
import { ensureDefaultSkills } from "./services/skillCatalogService.js";

validateEnvironment();

const PORT = process.env.PORT || 5001;
// หลัง nginx ให้ตั้ง HOST=127.0.0.1 เพื่อไม่ให้เข้าถึง API ตรงๆ จากเครือข่ายได้
// ถ้าไม่ตั้งจะฟังทุกอินเทอร์เฟซ (จำเป็นบน Railway และโฮสต์ลักษณะเดียวกัน)
const HOST = process.env.HOST;

const httpServer = http.createServer(app);
initSocket(httpServer, (process.env.CORS_ORIGIN || "http://localhost:5173").trim().replace(/\/+$/, ""));

connectDB()
  .then(() => {
    // เพิ่มทักษะอาชีพมาตรฐานที่ขาดอยู่ ไม่แก้ไขของเดิม
    ensureDefaultSkills().catch((err) => console.error("Seeding default skills failed", err));
    const onListening = () => console.log(`Server running on http://${HOST || "localhost"}:${PORT}`);
    if (HOST) httpServer.listen(PORT, HOST, onListening);
    else httpServer.listen(PORT, onListening);
    // เตือนผู้ที่บันทึกคอร์สไว้ว่าคอร์สใกล้หมดอายุ production รันแบบ
    // instance เดียว (ดู deploy/ecosystem.config.cjs) จึงใช้ตัวจับเวลาในโปรเซสเดียวได้
    // การเตือนไม่ซ้ำต่อคน ต่อคอร์ส ต่อวัน
    const remindAboutExpiringCourses = () => sendCourseExpiryReminders().catch((err) => console.error("Course expiry reminders failed", err));
    remindAboutExpiringCourses();
    setInterval(remindAboutExpiringCourses, 60 * 60 * 1000).unref();
    // เช่นเดียวกันสำหรับบทเรียนและสถานการณ์ แต่ส่งการเตือนไปหาเจ้าหน้าที่ผู้เขียน
    const remindAboutExpiringContent = () => sendContentExpiryReminders().catch((err) => console.error("Content expiry reminders failed", err));
    remindAboutExpiringContent();
    setInterval(remindAboutExpiringContent, 60 * 60 * 1000).unref();
    // บัญชีที่ถูกลบเก็บไว้ RETENTION_DAYS วันแล้วทำให้ไม่ระบุตัวตนถาวร งานนี้
    // รันกี่ครั้งก็ได้อย่างปลอดภัย: แตะเฉพาะบัญชีที่ครบกำหนดแล้ว
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
