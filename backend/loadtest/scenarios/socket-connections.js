// เปิดการเชื่อมต่อ Socket.IO ที่ผ่านการยืนยันตัวตนจำนวนมากพร้อมกัน แล้วปิดทั้งหมด
// เพื่อตรวจการปรับ maxHttpBufferSize ของ Phase-1 และการล้างตัวจับเวลาเมื่อตัดการเชื่อมต่อ
// (ซึ่งถูกต้องอยู่แล้ว) ใน backend/src/services/socket.js
// ว่ายังทำงานได้ดีเมื่อมีการเชื่อมต่อจำนวนมาก — autocannon รองรับเฉพาะ HTTP
// จึงต้องมีสคริปต์แยกต่างหาก
import { io } from "socket.io-client";
import { pathToFileURL } from "node:url";
import { loginUser } from "../helpers.js";

const CONNECTION_COUNT = Number(process.env.LOADTEST_SOCKET_CONNECTIONS) || 100;

function connectOne(baseUrl, token) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const socket = io(baseUrl, { auth: { token }, transports: ["websocket"], reconnection: false, timeout: 5000 });
    socket.on("connect", () => resolve({ socket, connectMs: Date.now() - started }));
    socket.on("connect_error", (err) => reject(err));
  });
}

export async function run(baseUrl) {
  const token = await loginUser(baseUrl);
  const startedAll = Date.now();

  const settled = await Promise.allSettled(
    Array.from({ length: CONNECTION_COUNT }, () => connectOne(baseUrl, token))
  );
  const connected = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = settled.filter((r) => r.status === "rejected");
  const totalConnectMs = Date.now() - startedAll;

  console.log(`\n--- socket-connections ---`);
  console.log(`requested: ${CONNECTION_COUNT}, connected: ${connected.length}, failed: ${failed.length}`);
  console.log(`total time to connect all: ${totalConnectMs}ms`);
  if (connected.length > 0) {
    const times = connected.map((c) => c.connectMs).sort((a, b) => a - b);
    console.log(`per-connection ms — min: ${times[0]}, median: ${times[Math.floor(times.length / 2)]}, max: ${times[times.length - 1]}`);
  }
  if (failed.length > 0) {
    console.warn(`WARNING: ${failed.length} connections failed:`, failed[0].reason?.message);
  }

  const disconnectStarted = Date.now();
  for (const { socket } of connected) socket.disconnect();
  console.log(`disconnected all in ${Date.now() - disconnectStarted}ms`);

  return { requested: CONNECTION_COUNT, connected: connected.length, failed: failed.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.env.LOADTEST_BASE_URL || "http://localhost:5001").then(() => process.exit(0));
}
