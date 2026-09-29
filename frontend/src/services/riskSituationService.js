import api from "./api.js";

export function getMyRiskSituationLogs() {
  return api.get("/risk-situations/me").then((res) => res.data);
}

export function createRiskSituationLog(payload) {
  return api.post("/risk-situations", payload).then((res) => res.data);
}

// Admin/counsellor: a specific patient's logged real-world risk situations.
export function getRiskSituationLogsForUser(userId) {
  return api.get(`/risk-situations/${userId}`).then((res) => res.data);
}
