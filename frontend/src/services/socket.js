import { io } from "socket.io-client";

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io("/", { path: "/socket.io", withCredentials: true });
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
