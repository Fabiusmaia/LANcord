import { useMediaStore } from "@renderer/store/mediaStore";
import Sidebar from "@renderer/components/Sidebar";
import ChatPanel from "@renderer/components/ChatPanel";
import ScreenShareGrid from "@renderer/components/ScreenShareGrid";
import ControlBar from "@renderer/components/ControlBar";
import RemoteAudio from "@renderer/components/RemoteAudio";

export default function RoomScreen(): JSX.Element {
  const remoteAudioStreams = useMediaStore((s) => s.remoteAudioStreams);

  return (
    <div className="room-screen">
      <Sidebar />
      <div className="room-main">
        <ScreenShareGrid />
        <ChatPanel />
        <ControlBar />
      </div>

      {Object.entries(remoteAudioStreams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} peerId={peerId} stream={stream} />
      ))}
    </div>
  );
}
