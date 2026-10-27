import axios from "axios";

// The login session lives in an HttpOnly cookie that the browser attaches by
// itself (`withCredentials`). Scripts on the page never see the token, so a
// script injected into the page could not steal it.
const api = axios.create({ baseURL: "/api", withCredentials: true });

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
