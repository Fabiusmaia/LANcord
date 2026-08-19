import { useEffect, useRef } from "react";
import { useMediaStore } from "@renderer/store/mediaStore";

type Props = {
  peerId: string;
  stream: MediaStream;
};

export default function RemoteAudio({ peerId, stream }: Props): JSX.Element {
  const ref = useRef<HTMLAudioElement>(null);
  const deafened = useMediaStore((s) => s.deafened);
  const locallyMuted = useMediaStore((s) => s.locallyMutedMics[peerId] ?? false);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <audio ref={ref} autoPlay muted={deafened || locallyMuted} />;
}
