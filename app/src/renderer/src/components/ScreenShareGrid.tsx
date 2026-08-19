import { useEffect, useRef } from "react";
import { useMembersStore } from "@renderer/store/membersStore";
import { useMediaStore } from "@renderer/store/mediaStore";

function VideoTile({
  label,
  stream,
  muted,
  onToggleMute,
}: {
  label: string;
  stream: MediaStream;
  muted: boolean;
  onToggleMute?: () => void;
}): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  function handleFullscreen(): void {
    ref.current?.requestFullscreen();
  }

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline muted={muted} onDoubleClick={handleFullscreen} />
      <span className="video-tile-label">{label}</span>
      {onToggleMute && (
        <button
          type="button"
          className="video-tile-mute"
          onClick={onToggleMute}
          title={muted ? "Reativar áudio da live" : "Mutar áudio da live"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}
      <button type="button" className="video-tile-fullscreen" onClick={handleFullscreen} title="Tela cheia">
        ⛶
      </button>
    </div>
  );
}

export default function ScreenShareGrid(): JSX.Element | null {
  const members = useMembersStore((s) => s.members);
  const remoteScreenStreams = useMediaStore((s) => s.remoteScreenStreams);
  const localSharing = useMediaStore((s) => s.sharing);
  const localScreenStream = useMediaStore((s) => s.screenStream);
  const deafened = useMediaStore((s) => s.deafened);
  const locallyMutedScreenAudio = useMediaStore((s) => s.locallyMutedScreenAudio);
  const toggleLocalScreenAudioMute = useMediaStore((s) => s.toggleLocalScreenAudioMute);

  const sharingPeers = Object.values(members).filter((m) => m.sharing && remoteScreenStreams[m.id]);

  if (!localSharing && sharingPeers.length === 0) return null;

  return (
    <section className="screen-share-grid">
      {localSharing && localScreenStream && (
        <VideoTile label="Você (compartilhando)" stream={localScreenStream} muted />
      )}
      {sharingPeers.map((m) => (
        <VideoTile
          key={m.id}
          label={m.username}
          stream={remoteScreenStreams[m.id]}
          muted={deafened || (locallyMutedScreenAudio[m.id] ?? false)}
          onToggleMute={() => toggleLocalScreenAudioMute(m.id)}
        />
      ))}
    </section>
  );
}
