import { useMediaStore } from "@renderer/store/mediaStore";
import { useRoomStore } from "@renderer/store/roomStore";
import RoomRail from "@renderer/components/RoomRail";
import Sidebar from "@renderer/components/Sidebar";
import ChatPanel from "@renderer/components/ChatPanel";
import ScreenShareGrid from "@renderer/components/ScreenShareGrid";
import ControlBar from "@renderer/components/ControlBar";
import RemoteAudio from "@renderer/components/RemoteAudio";

export default function RoomScreen(): JSX.Element {
  const remoteAudioStreams = useMediaStore((s) => s.remoteAudioStreams);
  const currentRoom = useRoomStore((s) => s.currentRoom);

  return (
    <div className="room-screen">
      <RoomRail />
      {currentRoom ? (
        <>
          <Sidebar />
          <div className="room-main">
            <ScreenShareGrid />
            <ChatPanel />
            <ControlBar />
          </div>
        </>
      ) : (
        <div className="room-main room-main-empty">Escolha uma sala à esquerda</div>
      )}

      {Object.entries(remoteAudioStreams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} peerId={peerId} stream={stream} />
      ))}
    </div>
  );
}
