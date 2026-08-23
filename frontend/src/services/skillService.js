import api from "./api.js";

export function getSkills() {
  return api.get("/skills").then((res) => res.data);
}

export function createSkill(payload) {
  return api.post("/skills", payload).then((res) => res.data);
}

export function getMySkills() {
  return api.get("/users/me/skills").then((res) => res.data);
}

export function addMySkill(payload) {
  return api.post("/users/me/skills", payload).then((res) => res.data);
}

export function updateMySkill(id, payload) {
  return api.put(`/users/me/skills/${id}`, payload).then((res) => res.data);
}

export function removeMySkill(id) {
  return api.delete(`/users/me/skills/${id}`).then((res) => res.data);
}
