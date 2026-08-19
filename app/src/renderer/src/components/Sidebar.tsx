import { useConnectionStore } from "@renderer/store/connectionStore";
import { useMembersStore } from "@renderer/store/membersStore";
import { useMediaStore } from "@renderer/store/mediaStore";
import { useRoomStore } from "@renderer/store/roomStore";

function MicIcon({ muted }: { muted: boolean }): JSX.Element {
  return <span className={muted ? "icon icon-muted" : "icon icon-mic"}>{muted ? "🔇" : "🎙️"}</span>;
}

function AvatarIcon(): JSX.Element {
  return (
    <svg className="member-avatar" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export default function Sidebar(): JSX.Element {
  const selfId = useConnectionStore((s) => s.selfId);
  const selfUsername = useConnectionStore((s) => s.username);
  const selfMuted = useMediaStore((s) => s.muted);
  const selfSharing = useMediaStore((s) => s.sharing);
  const members = useMembersStore((s) => s.members);
  const roomName = useRoomStore((s) => s.currentRoom?.name ?? "Sala");
  const locallyMutedMics = useMediaStore((s) => s.locallyMutedMics);
  const toggleLocalMicMute = useMediaStore((s) => s.toggleLocalMicMute);

  const others = Object.values(members);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">{roomName}</div>
      <div className="member-list">
        <div className="member-row" key={selfId ?? "self"}>
          <span className="member-name">
            <AvatarIcon />
            {selfUsername} (você)
          </span>
          <span className="member-badges">
            {selfSharing && <span className="icon">🖥️</span>}
            <MicIcon muted={selfMuted} />
          </span>
        </div>
        {others.map((m) => (
          <div className="member-row" key={m.id}>
            <span className="member-name">
              <AvatarIcon />
              {m.username}
            </span>
            <span className="member-badges">
              {m.sharing && <span className="icon">🖥️</span>}
              <button
                type="button"
                className="member-mute-btn"
                title={locallyMutedMics[m.id] ? "Reativar áudio (só pra você)" : "Mutar (só pra você)"}
                onClick={() => toggleLocalMicMute(m.id)}
              >
                {locallyMutedMics[m.id] ? <span className="icon icon-muted">🔇</span> : <MicIcon muted={m.muted} />}
              </button>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
