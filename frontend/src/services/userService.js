import api from "./api.js";

export function updateMyProfile(payload) {
  return api.put("/users/me", payload).then((res) => res.data);
}

export function getPublicProfile(id) {
  return api.get(`/users/${id}/public`).then((res) => res.data);
}

export function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  return api.post("/users/me/avatar", formData).then((res) => res.data);
}

export function uploadMyResume(file) {
  const formData = new FormData();
  formData.append("resume", file);
  return api.post("/users/me/resume", formData).then((res) => res.data);
}

export function addMyCertificate(file, name) {
  const formData = new FormData();
  formData.append("certificate", file);
  formData.append("name", name);
  return api.post("/users/me/certificates", formData).then((res) => res.data);
}

export function removeMyCertificate(id) {
  return api.delete(`/users/me/certificates/${id}`).then((res) => res.data);
}

export function listUsers(params) {
  return api.get("/users", { params }).then((res) => res.data);
}

export function listUsersPage(params, signal) {
  return api
    .get("/users", { params, signal })
    .then((res) => ({ items: res.data, total: Number(res.headers["x-total-count"]) || res.data.length }));
}

export function createUser(payload) {
  return api.post("/users", payload).then((res) => res.data);
}

export function getUser(id) {
  return api.get(`/users/${id}`).then((res) => res.data);
}

export function verifyUser(id, status, reason) {
  return api.put(`/users/${id}/verify`, reason ? { status, reason } : { status }).then((res) => res.data);
}

export function updateUser(id, payload) {
  return api.put(`/users/${id}`, payload).then((res) => res.data);
}

export function deleteUser(id) {
  return api.delete(`/users/${id}`).then((res) => res.data);
}

// "Delete my account": the password (or, for a Google-only account, the typed address) confirms it.
export function deleteMyAccount(payload) {
  return api.delete("/users/me", { data: payload }).then((res) => res.data);
}

export function listDeletedUsersPage(params, signal) {
  return api
    .get("/admin/deleted-users", { params, signal })
    .then((res) => ({ items: res.data, total: Number(res.headers["x-total-count"]) || res.data.length }));
}

export function getDeletedUser(id) {
  return api.get(`/admin/deleted-users/${id}`).then((res) => res.data);
}

export function restoreDeletedUser(id) {
  return api.post(`/admin/deleted-users/${id}/restore`).then((res) => res.data);
}

export const getMyRecoverySummary = () => api.get("/users/me/recovery-summary").then(res => res.data);
