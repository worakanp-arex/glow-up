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
    // CORS does not apply to a WebSocket upgrade, so refuse a browser that
    // opens one from another site. Clients that send no Origin (not browsers)
    // are left to the token check.
    allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === corsOrigin),
    // Behind proxies that only pass plain HTTP (e.g. Vercel rewrites) Socket.IO
    // stays on long-polling; a shorter interval keeps each poll under proxy timeouts.
    ...(process.env.SOCKET_PING_INTERVAL_MS && { pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS) }),
  });

  io.use(async (socket, next) => {
    try {
      const claims = jwt.verify(socketToken(socket.handshake), process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const user = await User.findById(claims.id).select(`_id ${SESSION_USER_FIELDS}`);
      // Same rules as the REST API: a suspended, removed or signed-out-by-password-change
      // account gets no live notifications either.
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

// Drops every live connection of one account. A socket checked its token only
// when it connected, so without this a suspended or signed-out account would keep
// receiving notifications until its token ran out. Clients reconnect on their own;
// the new handshake is checked again.
export function disconnectUser(userId) {
  if (!io) return;
  io.in((userId._id || userId).toString()).disconnectSockets(true);
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to((userId._id || userId).toString()).emit(event, payload);
}
