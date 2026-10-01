import api from "./api.js";

export function getDashboard() {
  return api.get("/admin/dashboard").then((res) => res.data);
}

export function getPointsPerLevel() {
  return api.get("/admin/settings/points-per-level").then((res) => res.data);
}

export function updatePointsPerLevel(pointsPerLevel) {
  return api.put("/admin/settings/points-per-level", { pointsPerLevel }).then((res) => res.data);
}
