import type { Server, Socket } from "socket.io";
import { addMember, getMember, getRoster, removeMember, updateStatus } from "./state.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerHandlers(io: AppServer, socket: AppSocket): void {
  socket.on("join", ({ username }) => {
    const trimmed = username.trim().slice(0, 32) || "Anônimo";
    const self = addMember(socket.id, trimmed);
    socket.emit("welcome", { self, members: getRoster(socket.id) });
    socket.broadcast.emit("member:joined", { member: self });
  });

  socket.on("signal", ({ to, kind, data }) => {
    io.to(to).emit("signal", { from: socket.id, kind, data });
  });

  socket.on("status:update", (status) => {
    const updated = updateStatus(socket.id, status);
    if (!updated) return;
    io.emit("member:status", { id: socket.id, muted: status.muted, sharing: status.sharing });
  });

  socket.on("chat:send", ({ text }) => {
    const member = getMember(socket.id);
    if (!member || !text.trim()) return;
    io.emit("chat:message", {
      id: socket.id,
      username: member.username,
      text: text.slice(0, 2000),
      ts: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    if (!getMember(socket.id)) return;
    removeMember(socket.id);
    io.emit("member:left", { id: socket.id });
  });
}
