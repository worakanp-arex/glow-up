// อัปโหลดรูปโปรไฟล์พร้อมกันหลายคำขอ เพื่อทดสอบการเขียนดิสก์ต่อคำขอของ multer
// และการตรวจ magic byte ของ Phase-1 (backend/src/middleware/upload.js)
// ภายใต้โหลดจริง ไม่ใช่แค่คำขอเดียวที่จำลอง
import autocannon from "autocannon";
import { pathToFileURL } from "node:url";
import { loginUser, printSummary, summarize } from "../helpers.js";

const BOUNDARY = "----loadtestboundary";
// ไบต์ขั้นต่ำที่ file-type รู้จักว่าเป็นภาพ image/jpeg (ดู backend/test/security.test.js)
const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

function buildMultipartBody() {
  const parts = [
    `--${BOUNDARY}\r\n`,
    `Content-Disposition: form-data; name="avatar"; filename="loadtest.jpg"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`,
  ];
  return Buffer.concat([Buffer.from(parts.join("")), TINY_JPEG, Buffer.from(`\r\n--${BOUNDARY}--\r\n`)]);
}

export async function run(baseUrl) {
  const token = await loginUser(baseUrl);
  const body = buildMultipartBody();

  const result = await autocannon({
    url: `${baseUrl}/api/users/me/avatar`,
    method: "POST",
    connections: 10,
    duration: 5,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
    },
    body,
  });

  const summary = summarize(result);
  printSummary("POST /api/users/me/avatar (concurrent uploads)", summary);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.env.LOADTEST_BASE_URL || "http://localhost:5001").then(() => process.exit(0));
}
