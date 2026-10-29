import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "http://localhost:5001";
  return {
  plugins: [react()],
  server: {
    // เฉพาะ localhost (ค่าเริ่มต้น): dev server และ proxy /api ของมันต้องไม่
    // ถูกเข้าถึงจากเครื่องอื่นในเครือข่าย ส่ง --host อย่างชัดเจนหากต้องการ
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
      },
      '/socket.io': {
        target,
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target,
        changeOrigin: true,
      },
    },
  },
};
})
