import api from "./api.js";

export function getCourses() {
  return api.get("/courses").then((res) => res.data);
}

export function getCourse(id) {
  return api.get(`/courses/${id}`).then((res) => res.data);
}

export function getMyCourses() {
  return api.get("/courses/mine").then((res) => res.data);
}

export function enrollCourse(id) {
  return api.post(`/courses/${id}/enroll`).then((res) => res.data);
}

export function updateProgress(id, progress) {
  return api.put(`/courses/${id}/progress`, { progress }).then((res) => res.data);
}

export function createCourse(payload) {
  return api.post("/courses", payload).then((res) => res.data);
}
