import { validateEnvironment } from "./config/env.js";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socket.js";

validateEnvironment();

const PORT = process.env.PORT || 5001;

const httpServer = http.createServer(app);
initSocket(httpServer, process.env.CORS_ORIGIN || "http://localhost:5173");

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
