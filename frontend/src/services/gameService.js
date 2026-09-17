import api from "./api.js";

export function getGameHubStatus() {
  return api.get("/games/me/status").then((res) => res.data);
}

export function getMyRadar() {
  return api.get("/games/me/radar").then((res) => res.data);
}

export function spinWheel() {
  return api.post("/games/wheel/spin").then((res) => res.data);
}

export function getMemoryPairs() {
  return api.get("/games/memory/today").then((res) => res.data);
}

export function submitMemoryResult(moves) {
  return api.post("/games/memory/submit", { moves }).then((res) => res.data);
}

export function getDailyQuiz() {
  return api.get("/games/quiz/today").then((res) => res.data);
}

export function submitQuiz(answers) {
  return api.post("/games/quiz/submit", { answers }).then((res) => res.data);
}
