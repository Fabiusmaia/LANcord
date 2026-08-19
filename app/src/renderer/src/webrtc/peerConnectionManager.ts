import type { SignalKind } from "@renderer/types";

type PeerEntry = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  micSender: RTCRtpSender | null;
  screenSender: RTCRtpSender | null;
  screenAudioSender: RTCRtpSender | null;
};

type Callbacks = {
  sendSignal: (to: string, kind: SignalKind, data: unknown) => void;
  onRemoteTrack: (peerId: string, kind: "audio" | "video", stream: MediaStream) => void;
  onPeerClosed: (peerId: string) => void;
};

let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

/** Substitui os ICE servers (STUN/TURN) usados nas proximas conexoes. Peers ja
 *  conectados nao sao afetados; chame antes de createPeer. */
export function setIceServers(servers: RTCIceServer[]): void {
  if (servers.length > 0) iceServers = servers;
}

const SCREEN_SHARE_MAX_BITRATE = 8_000_000; // ~8Mbps, adequado pra 1080p60 de conteudo de tela
const SCREEN_SHARE_MAX_FRAMERATE = 60;

/** Ajusta o encoder pra nao comprimir demais um compartilhamento de tela em
 *  alta resolucao/fps; sem isso o WebRTC usa um bitrate bem mais conservador
 *  por padrao e a imagem fica borrada/travada em 1080p60. */
async function applyScreenShareEncodingParams(sender: RTCRtpSender): Promise<void> {
  const params = sender.getParameters();
  if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
  params.encodings[0].maxBitrate = SCREEN_SHARE_MAX_BITRATE;
  params.encodings[0].maxFramerate = SCREEN_SHARE_MAX_FRAMERATE;
  // Sob pouca banda/CPU, prefere reduzir resolucao a derrubar frames -
  // pra 60fps, travar é pior do que perder um pouco de nitidez.
  params.degradationPreference = "maintain-framerate";
  try {
    await sender.setParameters(params);
  } catch (err) {
    console.error("[webrtc] falha ao ajustar bitrate do compartilhamento de tela", err);
  }
}

const STATS_LOG_INTERVAL_MS = 3000;
let statsTimer: ReturnType<typeof setInterval> | null = null;
const lastBytesSentByPeer = new Map<string, number>();

async function logScreenShareStats(peerId: string, entry: PeerEntry): Promise<void> {
  if (!entry.screenSender) return;
  const report = await entry.pc.getStats();

  const stats = Array.from(report.values()) as Record<string, unknown>[];
  const outbound = stats.find((r) => r.type === "outbound-rtp" && r.kind === "video");
  const activePair = stats.find((r) => r.type === "candidate-pair" && r.state === "succeeded");
  const localCandidate = activePair
    ? stats.find((r) => r.type === "local-candidate" && r.id === activePair.localCandidateId)
    : undefined;
  const connectionType = (localCandidate?.candidateType as string) ?? "desconhecida";

  const bytesSent = (outbound?.bytesSent as number) ?? 0;
  const prevBytes = lastBytesSentByPeer.get(peerId) ?? bytesSent;
  const kbps = Math.max(0, Math.round(((bytesSent - prevBytes) * 8) / 1000 / (STATS_LOG_INTERVAL_MS / 1000)));
  lastBytesSentByPeer.set(peerId, bytesSent);

  console.log(
    `[webrtc-stats] peer=${peerId} conexao=${connectionType} bitrate=${kbps}kbps ` +
      `fps=${outbound?.framesPerSecond ?? "?"} resolucao=${outbound?.frameWidth ?? "?"}x${outbound?.frameHeight ?? "?"} ` +
      `limitadoPor=${outbound?.qualityLimitationReason ?? "none"}`
  );
}

function ensureStatsLogger(): void {
  if (statsTimer) return;
  statsTimer = setInterval(() => {
    const sharing = Array.from(peers.entries()).filter(([, entry]) => entry.screenSender);
    if (sharing.length === 0) {
      if (statsTimer) clearInterval(statsTimer);
      statsTimer = null;
      lastBytesSentByPeer.clear();
      return;
    }
    sharing.forEach(([peerId, entry]) => void logScreenShareStats(peerId, entry));
  }, STATS_LOG_INTERVAL_MS);
}

const peers = new Map<string, PeerEntry>();
let callbacks: Callbacks | null = null;
let localMicStream: MediaStream | null = null;
let localScreenStream: MediaStream | null = null;

export function initPeerConnectionManager(cb: Callbacks): void {
  callbacks = cb;
}

function requireCallbacks(): Callbacks {
  if (!callbacks) throw new Error("peerConnectionManager não foi inicializado");
  return callbacks;
}

export function setLocalMicStream(stream: MediaStream | null): void {
  localMicStream = stream;
}

/** Cria a conexão com um peer. `isInitiator` marca este lado como "impolite" na
 *  resolução de colisão de renegociação (perfect negotiation): quem entrou por
 *  último inicia a conexão em direção a cada membro existente. */
export function createPeer(peerId: string, isInitiator: boolean): void {
  if (peers.has(peerId)) return;
  const cb = requireCallbacks();
  const pc = new RTCPeerConnection({ iceServers });
  const entry: PeerEntry = {
    pc,
    polite: !isInitiator,
    makingOffer: false,
    ignoreOffer: false,
    micSender: null,
    screenSender: null,
    screenAudioSender: null,
  };
  peers.set(peerId, entry);

  pc.onnegotiationneeded = async () => {
    try {
      entry.makingOffer = true;
      await pc.setLocalDescription();
      if (pc.localDescription) {
        cb.sendSignal(peerId, pc.localDescription.type as SignalKind, pc.localDescription);
      }
    } catch (err) {
      console.error("[webrtc] falha em negotiationneeded", err);
    } finally {
      entry.makingOffer = false;
    }
  };

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) cb.sendSignal(peerId, "ice", candidate.toJSON());
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    // Uma stream com faixa de video só pode ser o compartilhamento de tela (mic nunca tem video);
    // isso evita que o audio do compartilhamento de tela seja confundido com o audio do microfone,
    // já que ambos chegam como faixas "audio" separadas.
    const kind = stream.getVideoTracks().length > 0 ? "video" : "audio";
    cb.onRemoteTrack(peerId, kind, stream);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      closePeer(peerId);
    }
  };

  if (localMicStream) {
    const track = localMicStream.getAudioTracks()[0];
    if (track) entry.micSender = pc.addTrack(track, localMicStream);
  }
  if (localScreenStream) {
    const videoTrack = localScreenStream.getVideoTracks()[0];
    if (videoTrack) {
      entry.screenSender = pc.addTrack(videoTrack, localScreenStream);
      void applyScreenShareEncodingParams(entry.screenSender);
      ensureStatsLogger();
    }
    const audioTrack = localScreenStream.getAudioTracks()[0];
    if (audioTrack) entry.screenAudioSender = pc.addTrack(audioTrack, localScreenStream);
  }
}

export async function handleSignal(from: string, kind: SignalKind, data: unknown): Promise<void> {
  let entry = peers.get(from);
  if (!entry) {
    if (kind !== "offer") return;
    createPeer(from, false);
    entry = peers.get(from);
  }
  if (!entry) return;
  const { pc } = entry;

  try {
    if (kind === "offer" || kind === "answer") {
      const description = data as RTCSessionDescriptionInit;
      const offerCollision = kind === "offer" && (entry.makingOffer || pc.signalingState !== "stable");
      entry.ignoreOffer = !entry.polite && offerCollision;
      if (entry.ignoreOffer) return;

      await pc.setRemoteDescription(description);
      if (kind === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) {
          requireCallbacks().sendSignal(from, pc.localDescription.type as SignalKind, pc.localDescription);
        }
      }
    } else if (kind === "ice") {
      try {
        await pc.addIceCandidate(data as RTCIceCandidateInit);
      } catch (err) {
        if (!entry.ignoreOffer) throw err;
      }
    }
  } catch (err) {
    console.error("[webrtc] falha ao processar signal", err);
  }
}

export function addScreenTrackToAllPeers(stream: MediaStream): void {
  localScreenStream = stream;
  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];
  peers.forEach((entry) => {
    if (videoTrack) {
      entry.screenSender = entry.pc.addTrack(videoTrack, stream);
      void applyScreenShareEncodingParams(entry.screenSender);
      ensureStatsLogger();
    }
    if (audioTrack) entry.screenAudioSender = entry.pc.addTrack(audioTrack, stream);
  });
}

export function removeScreenTrackFromAllPeers(): void {
  peers.forEach((entry) => {
    if (entry.screenSender) {
      entry.pc.removeTrack(entry.screenSender);
      entry.screenSender = null;
    }
    if (entry.screenAudioSender) {
      entry.pc.removeTrack(entry.screenAudioSender);
      entry.screenAudioSender = null;
    }
  });
  localScreenStream = null;
}

function closePeer(peerId: string): void {
  const entry = peers.get(peerId);
  if (!entry) return;
  entry.pc.close();
  peers.delete(peerId);
  callbacks?.onPeerClosed(peerId);
}

export function removePeer(peerId: string): void {
  closePeer(peerId);
}

export function closeAllPeers(): void {
  Array.from(peers.keys()).forEach(closePeer);
  localMicStream = null;
  localScreenStream = null;
}

export function hasPeer(peerId: string): boolean {
  return peers.has(peerId);
}
