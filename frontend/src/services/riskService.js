import api from "./api.js";

export function getMyRisk() {
  return api.get("/risk/me").then((res) => res.data);
}

export function getRiskSummary() {
  return api.get("/risk/all").then((res) => res.data);
}
