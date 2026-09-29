import api from "./api.js";

export function getRecommendedCareers() {
  return api.get("/careers/recommendations").then((res) => res.data);
}
