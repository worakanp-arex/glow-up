import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import { initSocket } from "../src/services/socket.js";

async function start(t) {
  t.mock.method(User, "findById", () => ({ select: async () => ({ _id: "owner" }) }));
  const server = http.createServer();
  const io = initSocket(server, "http://localhost:5173");
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const clients = [];
  t.after(async () => { for (const ws of clients) ws.close(); await new Promise((resolve) => io.close(resolve)); });
  function connect(token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/socket.io/?EIO=4&transport=websocket`);
      clients.push(ws);
      ws.addEventListener("error", reject);
      ws.addEventListener("message", ({ data }) => {
        const packet = String(data);
        if (packet.startsWith("0")) ws.send("40" + JSON.stringify(token ? { token } : {}));
        else if (packet === "2") ws.send("3");
        else if (packet.startsWith("40") || packet.startsWith("44")) resolve({ ws, packet });
      });
    });
  }
  return { io, connect };
}
test("Socket.IO rejects connections without authentication", { timeout: 5000 }, async (t) => {
  const { connect } = await start(t);
  const { packet } = await connect();
  assert.ok(packet.startsWith("44")); assert.ok(packet.includes("Unauthorized"));
});
test("Socket.IO binds the room to the verified identity and ignores client room requests", { timeout: 5000 }, async (t) => {
  const { io, connect } = await start(t);
  const connected = new Promise((resolve) => io.once("connection", resolve));
  const token = jwt.sign({ id: "owner", role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const { ws, packet } = await connect(token);
  assert.ok(packet.startsWith("40"));
  const socket = await connected;
  assert.ok(socket.rooms.has("owner"));
  const received = new Promise((resolve) => socket.once("join", resolve));
  ws.send('42["join","victim"]');
  await received;
  assert.equal(socket.rooms.has("victim"), false);
});
