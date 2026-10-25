import api from "./api.js";

export function getActivityMissions() {
  return api.get("/activity-missions").then((res) => res.data);
}

export function createActivityMission(data) {
  return api.post("/activity-missions", data).then((res) => res.data);
}

export function updateActivityMission(id, data) {
  return api.put(`/activity-missions/${id}`, data).then((res) => res.data);
}

// Resolves to { archived: true, logCount } when the mission had history and was
// hidden instead of removed, or to undefined (204) when it was deleted.
export function deleteActivityMission(id) {
  return api.delete(`/activity-missions/${id}`).then((res) => res.data);
}

export function getMyTodayActivities() {
  return api.get("/activity-missions/me/today").then((res) => res.data);
}

export function getMyActivityHistory() {
  return api.get("/activity-missions/me/history").then((res) => res.data);
}

export function logActivity(id, data) {
  return api.post(`/activity-missions/${id}/log`, data).then((res) => res.data);
}

// Counsellor/admin review of activity logs from missions marked requiresApproval.
export function getPendingActivityApprovals() {
  return api.get("/activity-missions/logs/pending").then((res) => res.data);
}

export function reviewActivityLog(logId, approved, note) {
  return api.put(`/activity-missions/logs/${logId}/review`, note ? { approved, note } : { approved }).then((res) => res.data);
}
