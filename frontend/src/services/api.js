import axios from "axios";

// เซสชันล็อกอินอยู่ใน cookie แบบ HttpOnly ที่เบราว์เซอร์แนบเอง
// (`withCredentials`) สคริปต์ในหน้าเว็บไม่เห็น token ดังนั้น
// สคริปต์ที่ถูกแทรกเข้ามาจึงขโมยไม่ได้
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
