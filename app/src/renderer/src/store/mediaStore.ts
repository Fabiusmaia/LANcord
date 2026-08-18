import { create } from "zustand";

type MediaState = {
  localStream: MediaStream | null;
  muted: boolean;
  deafened: boolean;
  sharing: boolean;
  screenStream: MediaStream | null;
  /** Stream de áudio (mic) por peer — separado do vídeo pois cada `addTrack`
   *  no lado remoto chega como um `MediaStream` próprio. */
  remoteAudioStreams: Record<string, MediaStream>;
  /** Stream de vídeo (screen share) por peer. */
  remoteScreenStreams: Record<string, MediaStream>;
};

type MediaActions = {
  setLocalStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setSharing: (sharing: boolean) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setRemoteAudioStream: (peerId: string, stream: MediaStream) => void;
  setRemoteScreenStream: (peerId: string, stream: MediaStream) => void;
  removeRemotePeerStreams: (peerId: string) => void;
  reset: () => void;
};

const initialState: MediaState = {
  localStream: null,
  muted: false,
  deafened: false,
  sharing: false,
  screenStream: null,
  remoteAudioStreams: {},
  remoteScreenStreams: {},
};

export const useMediaStore = create<MediaState & MediaActions>((set) => ({
  ...initialState,
  setLocalStream: (localStream) => set({ localStream }),
  setMuted: (muted) => set({ muted }),
  setDeafened: (deafened) => set({ deafened }),
  setSharing: (sharing) => set({ sharing }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setRemoteAudioStream: (peerId, stream) =>
    set((s) => ({ remoteAudioStreams: { ...s.remoteAudioStreams, [peerId]: stream } })),
  setRemoteScreenStream: (peerId, stream) =>
    set((s) => ({ remoteScreenStreams: { ...s.remoteScreenStreams, [peerId]: stream } })),
  removeRemotePeerStreams: (peerId) =>
    set((s) => {
      const nextAudio = { ...s.remoteAudioStreams };
      const nextScreen = { ...s.remoteScreenStreams };
      delete nextAudio[peerId];
      delete nextScreen[peerId];
      return { remoteAudioStreams: nextAudio, remoteScreenStreams: nextScreen };
    }),
  reset: () => set(initialState),
}));
