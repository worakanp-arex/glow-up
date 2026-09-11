import api from "./api.js";

export function getMyRewards() {
  return api.get("/rewards/me").then((res) => res.data);
}
