import { useEffect, useRef } from "react";
import { useMembersStore } from "@renderer/store/membersStore";
import { useMediaStore } from "@renderer/store/mediaStore";

function VideoTile({ label, stream, muted }: { label: string; stream: MediaStream; muted: boolean }): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline muted={muted} />
      <span className="video-tile-label">{label}</span>
    </div>
  );
}

export default function ScreenShareGrid(): JSX.Element | null {
  const members = useMembersStore((s) => s.members);
  const remoteScreenStreams = useMediaStore((s) => s.remoteScreenStreams);
  const localSharing = useMediaStore((s) => s.sharing);
  const localScreenStream = useMediaStore((s) => s.screenStream);

  const sharingPeers = Object.values(members).filter((m) => m.sharing && remoteScreenStreams[m.id]);

  if (!localSharing && sharingPeers.length === 0) return null;

  return (
    <section className="screen-share-grid">
      {localSharing && localScreenStream && (
        <VideoTile label="Você (compartilhando)" stream={localScreenStream} muted />
      )}
      {sharingPeers.map((m) => (
        <VideoTile key={m.id} label={m.username} stream={remoteScreenStreams[m.id]} muted={false} />
      ))}
    </section>
  );
}
