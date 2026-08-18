import type { Server, Socket } from "socket.io";
import { addMember, getMember, getRoster, removeMember, updateStatus } from "./state.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ~5MB de imagem binaria, considerando o overhead de ~33% do base64.
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000;

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

  socket.on("chat:send", ({ text, image }) => {
    const member = getMember(socket.id);
    if (!member) return;
    const trimmedText = text.trim().slice(0, 2000);
    const validImage = typeof image === "string" && image.length <= MAX_IMAGE_DATA_URL_LENGTH ? image : undefined;
    if (!trimmedText && !validImage) return;
    io.emit("chat:message", {
      id: socket.id,
      username: member.username,
      text: trimmedText,
      image: validImage,
      ts: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    if (!getMember(socket.id)) return;
    removeMember(socket.id);
    io.emit("member:left", { id: socket.id });
  });
}
