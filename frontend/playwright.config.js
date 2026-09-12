import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "dark", use: { viewport: { width: 1440, height: 1000 }, colorScheme: "dark" } },
  ],
  ...(!process.env.CI && process.platform === "win32" ? { use: { baseURL: "http://127.0.0.1:5173", channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" } } : {}),
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort", url: "http://127.0.0.1:5173", reuseExistingServer: !process.env.CI },
});
