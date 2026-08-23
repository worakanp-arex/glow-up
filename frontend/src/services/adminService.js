import api from "./api.js";

export function getDashboard() {
  return api.get("/admin/dashboard").then((res) => res.data);
}
