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
