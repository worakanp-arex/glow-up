import api from "./api.js";

export function getScenarios() {
  return api.get("/scenarios").then((res) => res.data);
}

export function getAllScenarios() {
  return api.get("/scenarios/all").then((res) => res.data);
}

export function getScenario(id) {
  return api.get(`/scenarios/${id}`).then((res) => res.data);
}

export function getScenarioAdmin(id) {
  return api.get(`/scenarios/${id}/admin`).then((res) => res.data);
}

export function createScenario(payload) {
  return api.post("/scenarios", payload).then((res) => res.data);
}

export function updateScenario(id, payload) {
  return api.put(`/scenarios/${id}`, payload).then((res) => res.data);
}

export function deleteScenario(id) {
  return api.delete(`/scenarios/${id}`).then((res) => res.data);
}

export function attemptScenario(id, chosenOptionIndex) {
  return api.post(`/scenarios/${id}/attempt`, { chosenOptionIndex }).then((res) => res.data);
}

export function getMyAttempts() {
  return api.get("/scenarios/attempts/me").then((res) => res.data);
}
