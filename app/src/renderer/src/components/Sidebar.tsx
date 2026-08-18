import { useConnectionStore } from "@renderer/store/connectionStore";
import { useMembersStore } from "@renderer/store/membersStore";
import { useMediaStore } from "@renderer/store/mediaStore";

function MicIcon({ muted }: { muted: boolean }): JSX.Element {
  return <span className={muted ? "icon icon-muted" : "icon icon-mic"}>{muted ? "🔇" : "🎙️"}</span>;
}

export default function Sidebar(): JSX.Element {
  const selfId = useConnectionStore((s) => s.selfId);
  const selfUsername = useConnectionStore((s) => s.username);
  const selfMuted = useMediaStore((s) => s.muted);
  const selfSharing = useMediaStore((s) => s.sharing);
  const members = useMembersStore((s) => s.members);

  const others = Object.values(members);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Sala Geral</div>
      <div className="member-list">
        <div className="member-row" key={selfId ?? "self"}>
          <span className="member-name">{selfUsername} (você)</span>
          <span className="member-badges">
            {selfSharing && <span className="icon">🖥️</span>}
            <MicIcon muted={selfMuted} />
          </span>
        </div>
        {others.map((m) => (
          <div className="member-row" key={m.id}>
            <span className="member-name">{m.username}</span>
            <span className="member-badges">
              {m.sharing && <span className="icon">🖥️</span>}
              <MicIcon muted={m.muted} />
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
