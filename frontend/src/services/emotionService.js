import api from "./api.js";

export function logEmotion(payload) {
  return api.post("/emotion", payload).then((res) => res.data);
}

export function getMyEmotionLogs() {
  return api.get("/emotion/me").then((res) => res.data);
}

export function getMyStreak() {
  return api.get("/emotion/streak").then((res) => res.data);
}

export function getUserStreak(userId) {
  return api.get(`/emotion/${userId}/streak`).then((res) => res.data);
}

export function getUserEmotionLogs(userId) {
  return api.get(`/emotion/${userId}/logs`).then((res) => res.data);
}
