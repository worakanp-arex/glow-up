import api from "./api.js";

export function getJobCategories() {
  return api.get("/job-categories").then((res) => res.data);
}

export function createJobCategory(name) {
  return api.post("/job-categories", { name }).then((res) => res.data);
}

export function updateJobCategory(id, name) {
  return api.put(`/job-categories/${id}`, { name }).then((res) => res.data);
}

export function deleteJobCategory(id) {
  return api.delete(`/job-categories/${id}`).then((res) => res.data);
}