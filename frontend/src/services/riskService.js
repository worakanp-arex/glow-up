import api from "./api.js";

// Works out a fresh assessment from the latest emotion logs and stores it.
export function assessMyRisk() {
  return api.post("/risk/assess").then((res) => res.data);
}

// The most recent stored assessment, without computing a new one.
export function getMyRisk() {
  return api.get("/risk/me").then((res) => res.data);
}

export function getRiskSummary() {
  return api.get("/risk/all").then((res) => res.data);
}
