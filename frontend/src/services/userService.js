import api from "./api.js";

export function updateMyProfile(payload) {
  return api.put("/users/me", payload).then((res) => res.data);
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

export function verifyUser(id, status) {
  return api.put(`/users/${id}/verify`, { status }).then((res) => res.data);
}

export function updateUser(id, payload) {
  return api.put(`/users/${id}`, payload).then((res) => res.data);
}

export function deleteUser(id) {
  return api.delete(`/users/${id}`).then((res) => res.data);
}
