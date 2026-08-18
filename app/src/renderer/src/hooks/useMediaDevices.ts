import { useMediaStore } from "@renderer/store/mediaStore";
import { addScreenTrackToAllPeers, removeScreenTrackFromAllPeers } from "@renderer/webrtc/peerConnectionManager";
import { startAppAudioTrack, stopAppAudioTrack } from "@renderer/webrtc/appAudioTrack";
import { updateStatus } from "@renderer/hooks/useSocket";

export function toggleMute(): void {
  const { localStream, muted, setMuted } = useMediaStore.getState();
  const track = localStream?.getAudioTracks()[0];
  const next = !muted;
  if (track) track.enabled = !next;
  setMuted(next);
  updateStatus({ muted: next });
}

export function toggleDeafen(): void {
  const { deafened, setDeafened } = useMediaStore.getState();
  setDeafened(!deafened);
}

export async function startScreenShare(sourceId: string): Promise<void> {
  await window.electronAPI.setSelectedSource(sourceId);
  // Audio nao vem do getDisplayMedia (que so oferece loopback do sistema
  // inteiro); vem do appAudioTrack, que isola o audio do app/janela escolhida.
  const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const [videoTrack] = displayStream.getVideoTracks();
  videoTrack.onended = () => stopScreenShare();

  const audioTrack = await startAppAudioTrack(sourceId);
  const stream = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);

  addScreenTrackToAllPeers(stream);
  useMediaStore.getState().setScreenStream(stream);
  useMediaStore.getState().setSharing(true);
  updateStatus({ sharing: true });
}

export function stopScreenShare(): void {
  const { screenStream, setScreenStream, setSharing } = useMediaStore.getState();
  if (!screenStream) return;
  screenStream.getTracks().forEach((t) => t.stop());
  stopAppAudioTrack();
  removeScreenTrackFromAllPeers();
  setScreenStream(null);
  setSharing(false);
  updateStatus({ sharing: false });
}
