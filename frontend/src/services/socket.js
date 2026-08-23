import { io } from "socket.io-client";

let socket = null;

export function connectSocket(userId) {
  if (socket) return socket;
  socket = io("/", { path: "/socket.io" });
  socket.on("connect", () => {
    socket.emit("join", userId);
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onNotification(callback) {
  if (!socket) return () => {};
  const subscribedSocket = socket;
  subscribedSocket.on("notification", callback);
  return () => subscribedSocket.off("notification", callback);
}
