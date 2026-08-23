import api from "./api.js";

export function createSession(payload) {
  return api.post("/counselling", payload).then((res) => res.data);
}

export function getMySessions() {
  return api.get("/counselling/me").then((res) => res.data);
}
