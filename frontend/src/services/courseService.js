import api from "./api.js";

export function getCourses(params) {
  return api.get("/courses", { params }).then((res) => res.data);
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

export function unenrollCourse(id) {
  return api.delete(`/courses/${id}/enroll`).then((res) => res.data);
}

export function uploadCourseCertificate(id, file) {
  const formData = new FormData();
  formData.append("certificate", file);
  return api.post(`/courses/${id}/certificate`, formData).then((res) => res.data);
}

export function createCourse(payload) {
  return api.post("/courses", payload).then((res) => res.data);
}
