import api from "./api.js";

export function requestRegistrationOtp(payload) {
  return api.post("/auth/register/request-otp", payload).then((res) => res.data);
}

export function verifyRegistrationOtp(payload) {
  return api.post("/auth/register/verify-otp", payload).then((res) => res.data);
}

export function login(payload) {
  return api.post("/auth/login", payload).then((res) => res.data);
}

export function googleAuth(payload) {
  return api.post("/auth/google", payload).then((res) => res.data);
}

export function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email }).then((res) => res.data);
}

export function resetPassword(payload) {
  return api.post("/auth/reset-password", payload).then((res) => res.data);
}

export function getMe() {
  return api.get("/auth/me").then((res) => res.data);
}

export function logout() {
  return api.post("/auth/logout").then((res) => res.data);
}

export function changePassword(payload) {
  return api.put("/auth/change-password", payload).then((res) => res.data);
}
