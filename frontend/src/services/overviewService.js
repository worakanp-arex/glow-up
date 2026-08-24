import api from "./api.js";

export function getOverview() {
  return api.get("/overview").then((res) => res.data);
}
