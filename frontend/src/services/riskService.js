import api from "./api.js";

// คำนวณผลประเมินใหม่จากบันทึกอารมณ์ล่าสุดและบันทึกไว้
export function assessMyRisk() {
  return api.post("/risk/assess").then((res) => res.data);
}

// ผลประเมินที่บันทึกไว้ล่าสุด โดยไม่คำนวณใหม่
export function getMyRisk() {
  return api.get("/risk/me").then((res) => res.data);
}

export function getRiskSummary() {
  return api.get("/risk/all").then((res) => res.data);
}
