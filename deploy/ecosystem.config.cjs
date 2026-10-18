// PM2 process file for the glow-up backend.
// Start:   pm2 start deploy/ecosystem.config.cjs
// Keep a single instance: rate limits and Socket.IO rooms live in memory.
module.exports = {
  apps: [
    {
      name: "glow-up-api",
      cwd: __dirname + "/../backend",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "800M",
      time: true,
    },
  ],
};
