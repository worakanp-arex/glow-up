import axios from "axios";

const api = axios.create({ baseURL: "/api", withCredentials: true });

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.code !== "ERR_CANCELED" && error.config?.url !== "/auth/me" && !error.config?.silent) {
    window.dispatchEvent(new CustomEvent("api-error", { detail: {
      message: error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง",
      retry: error.config?.method === "get",
    } }));
  }
  return Promise.reject(error);
});
export default api;
