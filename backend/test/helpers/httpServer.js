import http from "node:http";
import app from "../../src/app.js";

// Boots the real Express app (no Mongo connection — app.js never calls
// connectDB, only server.js does) so tests exercise the real middleware
// stack: CORS, body-parser, sanitizer, helmet, rate limiters, routing.
export async function startServer(t) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}
