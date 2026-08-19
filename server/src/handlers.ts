import type { Server, Socket } from "socket.io";
import {
  addMember,
  createRoom,
  getMember,
  getMemberRoomId,
  getRoomForJoin,
  getRoster,
  joinRoom,
  leaveRoom,
  listRooms,
  removeMember,
  updateStatus,
} from "./state.js";
import { getIceServers } from "./turnCredentials.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ~5MB de imagem binaria, considerando o overhead de ~33% do base64.
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000;

const CHAT_RATE_LIMIT = { max: 10, windowMs: 10_000 };
const ROOM_CREATE_RATE_LIMIT = { max: 3, windowMs: 60_000 };
const rateLimitHits = new Map<string, number[]>();

/** Rate limit simples por socket, sem dependencia externa: mantem os
 *  timestamps das ultimas acoes numa janela deslizante. */
function isRateLimited(key: string, limit: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  const hits = (rateLimitHits.get(key) ?? []).filter((t) => now - t < limit.windowMs);
  hits.push(now);
  rateLimitHits.set(key, hits);
  return hits.length > limit.max;
}

function leaveCurrentRoom(io: AppServer, socket: AppSocket): void {
  const roomId = leaveRoom(socket.id);
  if (!roomId) return;
  socket.leave(roomId);
  socket.to(roomId).emit("member:left", { id: socket.id });
  broadcastRoomsList(io);
}

/** A lista de salas (nomes + contagem de membros) e global, entao qualquer
 *  mudanca (criar sala, entrar, sair) precisa avisar todo mundo conectado,
 *  nao so quem esta na sala afetada. */
function broadcastRoomsList(io: AppServer): void {
  io.emit("rooms:list", { rooms: listRooms() });
}

export function registerHandlers(io: AppServer, socket: AppSocket): void {
  socket.on("join", ({ username }) => {
    const trimmed = username.trim().slice(0, 32) || "Anônimo";
    addMember(socket.id, trimmed);
    socket.emit("rooms:list", { rooms: listRooms() });
  });

  socket.on("room:list", () => {
    socket.emit("rooms:list", { rooms: listRooms() });
  });

  socket.on("room:create", ({ name, password }) => {
    if (isRateLimited(`create:${socket.id}`, ROOM_CREATE_RATE_LIMIT)) return;
    const trimmedName = name.trim().slice(0, 48);
    if (!trimmedName || !getMember(socket.id)) return;
    const room = createRoom(trimmedName, password?.trim() || undefined);
    doJoinRoom(io, socket, room.id, password);
  });

  socket.on("room:join", ({ roomId, password }) => {
    doJoinRoom(io, socket, roomId, password);
  });

  socket.on("room:leave", () => {
    leaveCurrentRoom(io, socket);
  });

  socket.on("ice-servers:get", async (callback) => {
    if (!getMemberRoomId(socket.id)) {
      callback([]);
      return;
    }
    callback(await getIceServers());
  });

  socket.on("signal", ({ to, kind, data }) => {
    io.to(to).emit("signal", { from: socket.id, kind, data });
  });

  socket.on("status:update", (status) => {
    const roomId = getMemberRoomId(socket.id);
    const updated = updateStatus(socket.id, status);
    if (!updated || !roomId) return;
    io.to(roomId).emit("member:status", { id: socket.id, muted: status.muted, sharing: status.sharing });
  });

  socket.on("chat:send", ({ text, image }) => {
    const roomId = getMemberRoomId(socket.id);
    const member = getMember(socket.id);
    if (!member || !roomId) return;
    if (isRateLimited(`chat:${socket.id}`, CHAT_RATE_LIMIT)) return;
    const trimmedText = text.trim().slice(0, 2000);
    const validImage = typeof image === "string" && image.length <= MAX_IMAGE_DATA_URL_LENGTH ? image : undefined;
    if (!trimmedText && !validImage) return;
    io.to(roomId).emit("chat:message", {
      id: socket.id,
      username: member.username,
      text: trimmedText,
      image: validImage,
      ts: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    if (!getMember(socket.id)) return;
    leaveCurrentRoom(io, socket);
    removeMember(socket.id);
    rateLimitHits.delete(`chat:${socket.id}`);
    rateLimitHits.delete(`create:${socket.id}`);
  });
}

function doJoinRoom(io: AppServer, socket: AppSocket, roomId: string, password: string | undefined): void {
  const member = getMember(socket.id);
  if (!member) return;

  const check = getRoomForJoin(roomId, password);
  if (!check.ok) {
    const messages = {
      not_found: "Sala não encontrada.",
      wrong_password: "Senha incorreta.",
      full: "Sala cheia.",
    };
    socket.emit("room:error", { message: messages[check.reason] });
    return;
  }

  leaveCurrentRoom(io, socket);
  joinRoom(roomId, socket.id);
  socket.join(roomId);

  const room = listRooms().find((r) => r.id === roomId);
  if (!room) return;

  socket.emit("room:joined", { room, self: member, members: getRoster(roomId, socket.id) });
  socket.to(roomId).emit("member:joined", { member });
  broadcastRoomsList(io);
}
