import api from "./api.js";

export function getMyRewards() {
  return api.get("/rewards/me").then((res) => res.data);
}

// Admin management (badge/reward catalog).
export function getRewards() {
  return api.get("/rewards").then((res) => res.data);
}

export function createReward(payload) {
  return api.post("/rewards", payload).then((res) => res.data);
}

export function updateReward(id, payload) {
  return api.put(`/rewards/${id}`, payload).then((res) => res.data);
}

export function deleteReward(id) {
  return api.delete(`/rewards/${id}`).then((res) => res.data);
}
