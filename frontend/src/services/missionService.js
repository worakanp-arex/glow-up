import api from "./api.js";

export function getMyMissionProgress() {
  return api.get("/missions/me").then((res) => res.data);
}

export const getMyPointsSummary = () => api.get("/missions/me/summary").then(res => res.data);

// Admin management (points/badges/mission catalog).
export function getMissions() {
  return api.get("/missions").then((res) => res.data);
}

export function createMission(payload) {
  return api.post("/missions", payload).then((res) => res.data);
}

export function updateMission(id, payload) {
  return api.put(`/missions/${id}`, payload).then((res) => res.data);
}

export function deleteMission(id) {
  return api.delete(`/missions/${id}`).then((res) => res.data);
}

// Counsellor/admin: approve a "custom" mission for a specific patient.
export function approveCustomMission(missionId, userId) {
  return api.post(`/missions/${missionId}/approve`, { userId }).then((res) => res.data);
}
