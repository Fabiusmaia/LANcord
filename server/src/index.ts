import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerHandlers } from "./handlers.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

const PORT = Number(process.env.PORT ?? 3001);

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} conectado`);
  registerHandlers(io, socket);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`DiscordLAN signaling server ouvindo em 0.0.0.0:${PORT}`);
});
