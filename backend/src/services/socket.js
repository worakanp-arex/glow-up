import { Server } from "socket.io";

let io = null;

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin },
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (userId) socket.join(userId.toString());
    });
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
}
