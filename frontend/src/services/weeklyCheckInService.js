import api from "./api.js";

export function submitWeeklyCheckIn(payload) {
  return api.post("/weekly-checkins", payload).then((res) => res.data);
}

export function getMyWeeklyCheckIns() {
  return api.get("/weekly-checkins/me").then((res) => res.data);
}

export function getUserWeeklyCheckIns(userId) {
  return api.get(`/weekly-checkins/${userId}`).then((res) => res.data);
}
