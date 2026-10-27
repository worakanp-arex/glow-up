import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "http://localhost:5001";
  return {
  plugins: [react()],
  server: {
    // Localhost only (the default): the dev server and its /api proxy must not be
    // reachable from other machines on the network. Pass --host explicitly if needed.
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
