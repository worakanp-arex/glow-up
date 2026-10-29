import http from "node:http";
import app from "../../src/app.js";

// เริ่มแอป Express จริง (ไม่เชื่อมต่อ Mongo — app.js ไม่เคยเรียก
// connectDB มีเพียง server.js) เพื่อให้เทสต์ทดสอบ middleware
// stack จริงทั้งชุด: CORS, body-parser, sanitizer, helmet, rate limiter, routing
export async function startServer(t) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}
