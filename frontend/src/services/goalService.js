import api from "./api.js";

export function getMyGoals() {
  return api.get("/goals/me").then((res) => res.data);
}

export function createGoal(payload) {
  return api.post("/goals", payload).then((res) => res.data);
}

export function updateGoal(id, payload) {
  return api.put(`/goals/${id}`, payload).then((res) => res.data);
}

export function deleteGoal(id) {
  return api.delete(`/goals/${id}`).then((res) => res.data);
}
