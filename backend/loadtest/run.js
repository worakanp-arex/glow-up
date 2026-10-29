// ตัวรันการทดสอบโหลดแบบสั่งรันเอง ไม่ได้ผูกกับ CI ดูขั้นตอนใน loadtest/README.md
// (ต้องมี MongoDB ที่ทำงานอยู่และ backend ที่กำลังรัน)
import { run as authBruteforce } from "./scenarios/auth-bruteforce.js";
import { run as listEndpoints } from "./scenarios/list-endpoints.js";
import { run as fileUpload } from "./scenarios/file-upload.js";
import { run as socketConnections } from "./scenarios/socket-connections.js";

const baseUrl = process.env.LOADTEST_BASE_URL || "http://localhost:5001";

async function main() {
  console.log(`Load testing ${baseUrl}\n(run "node loadtest/seed.js" first if you haven't already)`);

  const health = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`Backend not reachable at ${baseUrl} — start it first with "npm run dev" (or "npm start").`);
    process.exit(1);
  }

  // auth-bruteforce ตั้งใจใช้โควตา rate limit ของการล็อกอินของ IP นี้จนหมด
  // (ใช้ร่วมกันระหว่างล็อกอิน/OTP/รีเซ็ตรหัสผ่าน ดู rateLimiters.js) จึงต้องรันเป็นอันดับสุดท้าย
  // เพราะสถานการณ์อื่นต้องล็อกอินก่อน
  await listEndpoints(baseUrl);
  await fileUpload(baseUrl);
  await socketConnections(baseUrl);
  await authBruteforce(baseUrl);

  console.log("\nDone. This is a diagnostic report, not a pass/fail CI gate — review the numbers above.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
