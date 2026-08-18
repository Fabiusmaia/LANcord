import type { SignalKind } from "@renderer/types";

type PeerEntry = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  micSender: RTCRtpSender | null;
  screenSender: RTCRtpSender | null;
};

type Callbacks = {
  sendSignal: (to: string, kind: SignalKind, data: unknown) => void;
  onRemoteTrack: (peerId: string, kind: "audio" | "video", stream: MediaStream) => void;
  onPeerClosed: (peerId: string) => void;
};

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const entry: PeerEntry = {
    pc,
    polite: !isInitiator,
    makingOffer: false,
    ignoreOffer: false,
    micSender: null,
    screenSender: null,
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
    if (stream) cb.onRemoteTrack(peerId, event.track.kind as "audio" | "video", stream);
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
    const track = localScreenStream.getVideoTracks()[0];
    if (track) entry.screenSender = pc.addTrack(track, localScreenStream);
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
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  peers.forEach((entry) => {
    entry.screenSender = entry.pc.addTrack(track, stream);
  });
}

export function removeScreenTrackFromAllPeers(): void {
  peers.forEach((entry) => {
    if (entry.screenSender) {
      entry.pc.removeTrack(entry.screenSender);
      entry.screenSender = null;
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
