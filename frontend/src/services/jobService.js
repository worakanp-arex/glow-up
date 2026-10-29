import api from "./api.js";

// byMatch: ผู้หางานที่ล็อกอินให้เซิร์ฟเวอร์เรียงงานจากทักษะที่ตรงมากไปน้อย (ก่อนแบ่งหน้า)
// ผู้เยี่ยมชมและบทบาทอื่นได้รายการเรียงตามวันที่ประกาศเหมือนเดิม
export function searchJobsPage(params, signal, { byMatch = false } = {}) {
  return api.get(byMatch ? "/jobs/matched" : "/jobs", { params, signal }).then((res) => ({ items: res.data, total: Number(res.headers["x-total-count"]) || res.data.length }));
}

export function searchJobs(params) {
  return api.get("/jobs", { params }).then((res) => res.data);
}

export function getJob(id) {
  return api.get(`/jobs/${id}`).then((res) => res.data);
}

export function getMyJobs() {
  return api.get("/jobs/mine").then((res) => res.data);
}

export function getMyJobsPage(params, signal) {
  return api
    .get("/jobs/mine", { params, signal })
    .then((res) => ({ items: res.data, total: Number(res.headers["x-total-count"]) || res.data.length }));
}

export function getMyJob(id) {
  return api.get(`/jobs/mine/${id}`).then((res) => res.data);
}

export function getMyJobsSummary() {
  return api.get("/jobs/mine/summary").then((res) => res.data);
}

export function uploadJobImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);
  return api.post(`/jobs/${id}/image`, formData).then((res) => res.data);
}

export function removeJobImage(id) {
  return api.delete(`/jobs/${id}/image`).then((res) => res.data);
}

export function getAllJobsForAdmin() {
  return api.get("/jobs/admin/all").then((res) => res.data);
}

export function getAllJobsForAdminPage(params, signal) {
  return api
    .get("/jobs/admin/all", { params, signal })
    .then((res) => ({ items: res.data, total: Number(res.headers["x-total-count"]) || res.data.length }));
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

export function confirmJob(id, status, reason) {
  return api.put(`/jobs/${id}/confirm`, reason ? { status, reason } : { status }).then((res) => res.data);
}

export function getSavedJobs() {
  return api.get("/jobs/saved").then((res) => res.data);
}

export function getSavedJobIds() {
  return api.get("/jobs/saved/ids").then((res) => res.data);
}

export function saveJob(id) {
  return api.post(`/jobs/${id}/save`).then((res) => res.data);
}

export function unsaveJob(id) {
  return api.delete(`/jobs/${id}/save`).then((res) => res.data);
}
