import api from "./api.js";

export function getMissionCategories() {
  return api.get("/mission-categories").then((res) => res.data);
}

export function createMissionCategory(payload) {
  return api.post("/mission-categories", payload).then((res) => res.data);
}

export function updateMissionCategory(id, payload) {
  return api.put(`/mission-categories/${id}`, payload).then((res) => res.data);
}

export function deleteMissionCategory(id) {
  return api.delete(`/mission-categories/${id}`).then((res) => res.data);
}
