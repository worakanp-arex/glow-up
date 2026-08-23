import api from "./api.js";

export function getRecoveryNews(limit = 6) {
  return api.get("/news", { params: { limit } }).then((res) => res.data.articles);
}
