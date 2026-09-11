import api from "./api.js";

export function getLessons() {
  return api.get("/micro-lessons").then((res) => res.data);
}

export function getAllLessons() {
  return api.get("/micro-lessons/all").then((res) => res.data);
}

export function getLesson(id) {
  return api.get(`/micro-lessons/${id}`).then((res) => res.data);
}

export function createLesson(payload) {
  return api.post("/micro-lessons", payload).then((res) => res.data);
}

export function updateLesson(id, payload) {
  return api.put(`/micro-lessons/${id}`, payload).then((res) => res.data);
}

export function deleteLesson(id) {
  return api.delete(`/micro-lessons/${id}`).then((res) => res.data);
}
