import api from "./api.js";

export function searchJobs(params) {
  return api.get("/jobs", { params }).then((res) => res.data);
}

export function getJob(id) {
  return api.get(`/jobs/${id}`).then((res) => res.data);
}

export function getMyJobs() {
  return api.get("/jobs/mine").then((res) => res.data);
}

export function getAllJobsForAdmin() {
  return api.get("/jobs/admin/all").then((res) => res.data);
}

export function createJob(payload) {
  return api.post("/jobs", payload).then((res) => res.data);
}

export function updateJob(id, payload) {
  return api.put(`/jobs/${id}`, payload).then((res) => res.data);
}

export function deleteJob(id) {
  return api.delete(`/jobs/${id}`).then((res) => res.data);
}

export function confirmJob(id, status) {
  return api.put(`/jobs/${id}/confirm`, { status }).then((res) => res.data);
}
