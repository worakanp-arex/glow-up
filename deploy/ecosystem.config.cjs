// ไฟล์โปรเซส PM2 สำหรับ backend ของ glow-up
// เริ่มด้วย:   pm2 start deploy/ecosystem.config.cjs
// ให้รันแบบ instance เดียว: rate limit และห้อง Socket.IO อยู่ในหน่วยความจำ
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
