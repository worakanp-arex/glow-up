import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sessionRejection, SESSION_USER_FIELDS } from "../middleware/authMiddleware.js";

let io = null;

export function socketToken(handshake) {
  if (handshake.auth?.token) return handshake.auth.token;
  const entry = (handshake.headers?.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("token="));
  try { return entry ? decodeURIComponent(entry.slice(6)) : null; } catch { return null; }
}

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    // CORS ไม่มีผลกับการอัปเกรดเป็น WebSocket จึงปฏิเสธเบราว์เซอร์ที่
    // เปิดจากเว็บอื่น ไคลเอนต์ที่ไม่ส่ง Origin (ไม่ใช่เบราว์เซอร์)
    // ปล่อยให้การตรวจ token ตัดสิน
    allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === corsOrigin),
    // หลัง proxy ที่ส่งผ่านเฉพาะ HTTP ธรรมดา (เช่น Vercel rewrites) Socket.IO
    // จะอยู่ที่ long-polling ช่วงเวลาที่สั้นลงทำให้แต่ละ poll ไม่เกินเวลา timeout ของ proxy
    ...(process.env.SOCKET_PING_INTERVAL_MS && { pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS) }),
  });

  io.use(async (socket, next) => {
    try {
      const claims = jwt.verify(socketToken(socket.handshake), process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const user = await User.findById(claims.id).select(`_id ${SESSION_USER_FIELDS}`);
      // กฎเดียวกับ REST API: บัญชีที่ถูกระงับ ลบ หรือถูกออกจากระบบเพราะเปลี่ยนรหัสผ่าน
      // ก็ไม่ได้รับการแจ้งเตือนสดเช่นกัน
      if (!claims.exp || sessionRejection(claims, user)) throw new Error("Unauthorized");
      socket.data.userId = user._id.toString();
      socket.data.expiresAt = claims.exp * 1000;
      next();
    } catch { next(new Error("Unauthorized")); }
  });
  io.on("connection", (socket) => {
    socket.join(socket.data.userId);
    const timer = setTimeout(() => socket.disconnect(true), Math.min(socket.data.expiresAt - Date.now(), 2147483647));
    timer.unref?.();
    socket.on("disconnect", () => clearTimeout(timer));
  });

  return io;
}

// ตัดการเชื่อมต่อสดทั้งหมดของบัญชีหนึ่ง socket ตรวจ token เฉพาะตอนเชื่อมต่อ
// หากไม่มีตัวนี้ บัญชีที่ถูกระงับหรือออกจากระบบจะยังได้รับการแจ้งเตือน
// จน token หมดอายุ ไคลเอนต์เชื่อมต่อใหม่เอง
// และ handshake ใหม่จะถูกตรวจอีกครั้ง
export function disconnectUser(userId) {
  if (!io) return;
  io.in((userId._id || userId).toString()).disconnectSockets(true);
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to((userId._id || userId).toString()).emit(event, payload);
}
