import api from "./api.js";

export function getJobCategories() {
  return api.get("/job-categories").then((res) => res.data);
}

export function createJobCategory(name) {
  return api.post("/job-categories", { name }).then((res) => res.data);
}
