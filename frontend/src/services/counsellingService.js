import api from "./api.js";

export function createSession(payload) {
  return api.post("/counselling", payload).then((res) => res.data);
}

export function getMySessions() {
  return api.get("/counselling/me").then((res) => res.data);
}

export function getQueue(params) {
  return api.get("/counselling", { params }).then((res) => res.data);
}

export function getMySchedule() {
  return api.get("/counselling/schedule/mine").then((res) => res.data);
}

export function getPatientProfile(userId) {
  return api.get(`/counselling/patients/${userId}`).then((res) => res.data);
}

export function getSession(id) {
  return api.get(`/counselling/${id}`).then((res) => res.data);
}

export function claimSession(id) {
  return api.put(`/counselling/${id}/claim`).then((res) => res.data);
}

export function addMessage(id, content) {
  return api.post(`/counselling/${id}/messages`, { content }).then((res) => res.data);
}

export function updateSchedule(id, payload) {
  return api.put(`/counselling/${id}/schedule`, payload).then((res) => res.data);
}

export function updateStatus(id, status) {
  return api.put(`/counselling/${id}/status`, { status }).then((res) => res.data);
}
