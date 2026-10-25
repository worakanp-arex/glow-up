import api from "./api.js";

export function inviteFamilyMember(email) {
  return api.post("/family/invite", { email }).then((res) => res.data);
}

export function getMyInvitedFamily() {
  return api.get("/family/invited").then((res) => res.data);
}

export function revokeFamilyLink(id) {
  return api.put(`/family/invited/${id}/revoke`).then((res) => res.data);
}

export function acceptFamilyInvite(payload) {
  return api.post("/family/accept", payload).then((res) => res.data);
}

export function getMyFamilyLinks() {
  return api.get("/family/links").then((res) => res.data);
}

export function getLinkedUserSummary(linkId) {
  return api.get(`/family/links/${linkId}/summary`).then((res) => res.data);
}

export function getFamilyLinksForUser(userId) {
  return api.get(`/family/users/${userId}/links`).then((res) => res.data);
}

export function sendEncouragementMessage(linkId, message, replyTo) {
  return api.post(`/family/links/${linkId}/messages`, { message, replyTo }).then((res) => res.data);
}

export function getFamilyMessages(linkId) {
  return api.get(`/family/links/${linkId}/messages`).then((res) => res.data);
}

export function getLatestFamilyMessage() {
  return api.get("/family/messages/latest").then((res) => res.data);
}

export function markFamilyMessageRead(id) {
  return api.put(`/family/messages/${id}/read`, {}, { silent: true }).then((res) => res.data);
}

export function requestFamilyLink(email) {
  return api.post("/family/request", { email }).then((res) => res.data);
}

export function respondToFamilyRequest(id, approve) {
  return api.put(`/family/invited/${id}/respond`, { approve }).then((res) => res.data);
}
