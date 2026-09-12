import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let io = null;

export function socketToken(handshake) {
  if (handshake.auth?.token) return handshake.auth.token;
  const entry = (handshake.headers?.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("token="));
  try { return entry ? decodeURIComponent(entry.slice(6)) : null; } catch { return null; }
}

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const claims = jwt.verify(socketToken(socket.handshake), process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const user = await User.findById(claims.id).select("_id");
      if (!user || !claims.exp) throw new Error("Unauthorized");
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

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to((userId._id || userId).toString()).emit(event, payload);
}
