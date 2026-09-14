import api from "./api.js";

export function getMyMissionProgress() {
  return api.get("/missions/me").then((res) => res.data);
}

export const getMyPointsSummary = () => api.get("/missions/me/summary").then(res => res.data);
