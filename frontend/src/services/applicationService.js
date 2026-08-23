import api from "./api.js";

export function applyToJob(jobId, files) {
  if (files && files.length > 0) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return api.post(`/applications/jobs/${jobId}/apply`, formData).then((res) => res.data);
  }
  return api.post(`/applications/jobs/${jobId}/apply`).then((res) => res.data);
}

export function cancelApplication(id) {
  return api.put(`/applications/${id}/cancel`).then((res) => res.data);
}

export function getMyApplications() {
  return api.get("/applications/me").then((res) => res.data);
}

export function getJobApplicants(jobId) {
  return api.get(`/applications/jobs/${jobId}/applicants`).then((res) => res.data);
}

export function getApplication(id) {
  return api.get(`/applications/${id}`).then((res) => res.data);
}

export function updateApplicationStatus(id, payload) {
  return api.put(`/applications/${id}/status`, payload).then((res) => res.data);
}
