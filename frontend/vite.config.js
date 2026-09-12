import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "http://localhost:5001";
  return {
  plugins: [react()],
  server: {
    host: true,
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
