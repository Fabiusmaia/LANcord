import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerHandlers } from "./handlers.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

const PORT = Number(process.env.PORT ?? 3001);

const httpServer = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("LANcord signaling server no ar.");
  }
});
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 8_000_000,
});

io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} conectado`);
  registerHandlers(io, socket);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`DiscordLAN signaling server ouvindo em 0.0.0.0:${PORT}`);
});
