import api from "./api.js";

export function getMyNotifications() {
  return api.get("/notifications/me").then((res) => res.data);
}

export function markAsRead(id) {
  return api.put(`/notifications/${id}/read`).then((res) => res.data);
}

export const markAllAsRead = () => api.put("/notifications/me/read");
export const clearMyNotifications = () => api.delete("/notifications/me");
