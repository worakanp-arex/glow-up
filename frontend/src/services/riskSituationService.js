import api from "./api.js";

export function getMyRiskSituationLogs() {
  return api.get("/risk-situations/me").then((res) => res.data);
}

export function createRiskSituationLog(payload) {
  return api.post("/risk-situations", payload).then((res) => res.data);
}

// แอดมิน/ผู้ให้คำปรึกษา: เหตุการณ์เสี่ยงในชีวิตจริงที่ผู้ป่วยเฉพาะรายบันทึกไว้
export function getRiskSituationLogsForUser(userId) {
  return api.get(`/risk-situations/${userId}`).then((res) => res.data);
}
