import api from "./api.js";

export function getOverview() {
  return api.get("/overview").then((res) => res.data);
}

export function getActivityOverview(days) {
  return api.get("/overview/activity", { params: days ? { days } : undefined }).then((res) => res.data);
}

export function getAttempts(params) {
  return api.get("/overview/attempts", { params }).then((res) => res.data);
}

export function getOverviewUsers(kind) {
  return api.get("/overview/users", { params: { kind } }).then((res) => res.data);
}