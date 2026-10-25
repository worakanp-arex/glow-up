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

export function getEmotionToday() {
  return api.get("/games/emotion/today").then((res) => res.data);
}

export function submitEmotion(answers) {
  return api.post("/games/emotion/submit", { answers }).then((res) => res.data);
}

export function submitBreathing(rounds) {
  return api.post("/games/breathing/submit", { rounds }).then((res) => res.data);
}