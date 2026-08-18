import { io, type Socket } from "socket.io-client";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { useMembersStore } from "@renderer/store/membersStore";
import { useChatStore } from "@renderer/store/chatStore";
import { useMediaStore } from "@renderer/store/mediaStore";
import type { ClientToServerEvents, ServerToClientEvents } from "@renderer/types";
import {
  closeAllPeers,
  createPeer,
  handleSignal,
  initPeerConnectionManager,
  removePeer,
  setLocalMicStream,
} from "@renderer/webrtc/peerConnectionManager";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

initPeerConnectionManager({
  sendSignal: (to, kind, data) => socket?.emit("signal", { to, kind, data }),
  onRemoteTrack: (peerId, kind, stream) => {
    if (kind === "audio") useMediaStore.getState().setRemoteAudioStream(peerId, stream);
    else useMediaStore.getState().setRemoteScreenStream(peerId, stream);
  },
  onPeerClosed: (peerId) => useMediaStore.getState().removeRemotePeerStreams(peerId),
});

export async function connect(host: string, port: number, username: string): Promise<void> {
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

  socket = io(`http://${host}:${port}`, { transports: ["websocket"], reconnectionAttempts: Infinity });

  socket.on("connect_error", (err) => {
    setError(`Não foi possível conectar ao servidor: ${err.message}`);
    setStatus("disconnected");
  });

  socket.on("connect", () => {
    socket?.emit("join", { username });
  });

  socket.on("welcome", ({ self, members }) => {
    setSelf(self.id, self.username, host, port);
    setStatus("connected");
    useMembersStore.getState().setRoster(members);
    members.forEach((m) => createPeer(m.id, true));
  });

  socket.on("member:joined", ({ member }) => {
    useMembersStore.getState().addMember(member);
  });

  socket.on("member:left", ({ id }) => {
    useMembersStore.getState().removeMember(id);
    removePeer(id);
  });

  socket.on("member:status", ({ id, muted, sharing }) => {
    useMembersStore.getState().updateStatus(id, { muted, sharing });
  });

  socket.on("signal", ({ from, kind, data }) => {
    void handleSignal(from, kind, data);
  });

  socket.on("chat:message", (message) => {
    useChatStore.getState().addMessage(message);
  });

  socket.on("disconnect", () => {
    setStatus("disconnected");
  });
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
}

export function sendChat(text: string): void {
  socket?.emit("chat:send", { text });
}

export function updateStatus(status: { muted?: boolean; sharing?: boolean }): void {
  socket?.emit("status:update", status);
}
