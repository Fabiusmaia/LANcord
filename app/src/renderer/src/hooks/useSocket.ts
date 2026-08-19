import { io, type Socket } from "socket.io-client";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { useMembersStore } from "@renderer/store/membersStore";
import { useChatStore } from "@renderer/store/chatStore";
import { useMediaStore } from "@renderer/store/mediaStore";
import { useRoomStore } from "@renderer/store/roomStore";
import { playSfx } from "@renderer/utils/sfx";
import type { ClientToServerEvents, ServerToClientEvents } from "@renderer/types";
import {
  closeAllPeers,
  createPeer,
  handleSignal,
  initPeerConnectionManager,
  removePeer,
  setIceServers,
  setLocalMicStream,
} from "@renderer/webrtc/peerConnectionManager";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Sala que sempre existe no servidor (criada em `ensureDefaultRoom` no server) —
 *  entramos nela automaticamente ao conectar, como o canal padrão do Discord. */
const DEFAULT_ROOM_ID = "default";

let socket: AppSocket | null = null;

initPeerConnectionManager({
  sendSignal: (to, kind, data) => socket?.emit("signal", { to, kind, data }),
  onRemoteTrack: (peerId, kind, stream) => {
    if (kind === "audio") useMediaStore.getState().setRemoteAudioStream(peerId, stream);
    else useMediaStore.getState().setRemoteScreenStream(peerId, stream);
  },
  onPeerClosed: (peerId) => useMediaStore.getState().removeRemotePeerStreams(peerId),
});

/** Aceita "26.x.x.x:3001" (LAN/Radmin) ou uma URL completa como
 *  "https://algo.trycloudflare.com" (tunnel). Sem porta explicita, assume 3001. */
function resolveServerUrl(rawAddress: string): string {
  const address = rawAddress.trim().replace(/\/+$/, "");
  if (/^[a-z]+:\/\//i.test(address)) return address;
  if (address.includes(":")) return `http://${address}`;
  return `http://${address}:3001`;
}

/** Busca STUN/TURN do servidor via socket.io (so responde depois que o socket
 *  entrou numa sala). Falha silenciosamente pro STUN padrao se nao responder
 *  a tempo. */
async function loadIceServers(): Promise<void> {
  if (!socket) return;
  try {
    const iceServers = await new Promise<RTCIceServer[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 4000);
      socket?.emit("ice-servers:get", (servers) => {
        clearTimeout(timer);
        resolve(servers);
      });
    });
    setIceServers(iceServers);
  } catch (err) {
    console.error("[useSocket] falha ao buscar ice-servers, usando STUN padrao", err);
  }
}

export async function connect(address: string, username: string): Promise<void> {
  const { setStatus, setSelf, setError } = useConnectionStore.getState();
  setStatus("connecting");
  setError(null);

  let micStream: MediaStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    setError("Não foi possível acessar o microfone. Verifique as permissões.");
    setStatus("disconnected");
    return;
  }
  setLocalMicStream(micStream);
  useMediaStore.getState().setLocalStream(micStream);

  const serverUrl = resolveServerUrl(address);
  socket = io(serverUrl, { transports: ["websocket"], reconnectionAttempts: Infinity });

  socket.on("connect_error", (err) => {
    setError(`Não foi possível conectar ao servidor: ${err.message}`);
    setStatus("disconnected");
  });

  socket.on("connect", () => {
    if (!socket?.id) return;
    setSelf(socket.id, username, address);
    socket.emit("join", { username });
  });

  socket.on("rooms:list", ({ rooms }) => {
    useRoomStore.getState().setRooms(rooms);
    setStatus("connected");
  });

  // So na primeira vez: entra direto na sala padrao, como o canal inicial do Discord.
  socket.once("rooms:list", () => joinRoom(DEFAULT_ROOM_ID));

  socket.on("room:joined", ({ room, members }) => {
    if (useRoomStore.getState().currentRoom) playSfx("userLeft");
    closeAllPeers();
    useRoomStore.getState().setCurrentRoom(room);
    useRoomStore.getState().setError(null);
    useMembersStore.getState().setRoster(members);
    void loadIceServers().then(() => members.forEach((m) => createPeer(m.id, true)));
    playSfx("userJoined");
  });

  socket.on("room:error", ({ message }) => {
    useRoomStore.getState().setError(message);
  });

  socket.on("member:joined", ({ member }) => {
    useMembersStore.getState().addMember(member);
    playSfx("userJoined");
  });

  socket.on("member:left", ({ id }) => {
    useMembersStore.getState().removeMember(id);
    removePeer(id);
    playSfx("userLeft");
  });

  socket.on("member:status", ({ id, muted, sharing }) => {
    const wasSharing = useMembersStore.getState().members[id]?.sharing ?? false;
    useMembersStore.getState().updateStatus(id, { muted, sharing });
    if (sharing && !wasSharing) playSfx("userSharedScreen");
  });

  socket.on("signal", ({ from, kind, data }) => {
    void handleSignal(from, kind, data);
  });

  socket.on("chat:message", (message) => {
    useChatStore.getState().addMessage(message);
    playSfx("message");
  });

  socket.on("disconnect", () => {
    setStatus("disconnected");
  });
}

export function listRooms(): void {
  socket?.emit("room:list");
}

export function createRoom(name: string, password?: string): void {
  socket?.emit("room:create", { name, password: password || undefined });
}

export function joinRoom(roomId: string, password?: string): void {
  socket?.emit("room:join", { roomId, password: password || undefined });
}

export function disconnect(): void {
  socket?.disconnect();
  socket = null;
  closeAllPeers();

  const { localStream, screenStream } = useMediaStore.getState();
  localStream?.getTracks().forEach((t) => t.stop());
  screenStream?.getTracks().forEach((t) => t.stop());

  useConnectionStore.getState().reset();
  useMembersStore.getState().reset();
  useChatStore.getState().reset();
  useMediaStore.getState().reset();
  useRoomStore.getState().reset();
}

export function sendChat(text: string, image?: string): void {
  socket?.emit("chat:send", { text, image });
}

export function updateStatus(status: { muted?: boolean; sharing?: boolean }): void {
  socket?.emit("status:update", status);
}
