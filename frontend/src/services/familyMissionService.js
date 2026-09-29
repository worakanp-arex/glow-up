import api from "./api.js";

export function getMyTodayFamilyMissions() {
  return api.get("/family-missions/me/today").then((res) => res.data);
}

export function confirmFamilyMission(familyMissionId) {
  return api.post("/family-missions/confirm", { familyMissionId }).then((res) => res.data);
}

// Admin management (family mission catalog).
export function getFamilyMissions() {
  return api.get("/family-missions").then((res) => res.data);
}

export function createFamilyMission(payload) {
  return api.post("/family-missions", payload).then((res) => res.data);
}

export function deleteFamilyMission(id) {
  return api.delete(`/family-missions/${id}`).then((res) => res.data);
}
