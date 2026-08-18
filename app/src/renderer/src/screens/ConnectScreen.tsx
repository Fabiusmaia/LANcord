import { useEffect, useState } from "react";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { connect } from "@renderer/hooks/useSocket";
import type { RecentConnection } from "../../../shared/types";

export default function ConnectScreen(): JSX.Element {
  const status = useConnectionStore((s) => s.status);
  const error = useConnectionStore((s) => s.error);
  const [username, setUsername] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("3001");
  const [recent, setRecent] = useState<RecentConnection[]>([]);

  useEffect(() => {
    window.electronAPI.getRecentConnections().then(setRecent);
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const portNumber = Number(port);
    if (!username.trim() || !host.trim() || !portNumber) return;

    await window.electronAPI.addRecentConnection({
      host: host.trim(),
      port: portNumber,
      username: username.trim(),
      lastUsedAt: Date.now(),
    });
    void connect(host.trim(), portNumber, username.trim());
  }

  function fillFromRecent(c: RecentConnection): void {
    setUsername(c.username);
    setHost(c.host);
    setPort(String(c.port));
  }

  return (
    <div className="connect-screen">
      <form className="connect-card" onSubmit={handleSubmit}>
        <h1>DiscordLAN</h1>
        <p className="subtitle">Conecte-se ao servidor de um amigo na sua LAN Radmin.</p>

        <label>
          Seu nome
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} required />
        </label>

        <div className="host-port-row">
          <label>
            IP do servidor
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="26.x.x.x" required />
          </label>
          <label className="port-label">
            Porta
            <input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" required />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={status === "connecting"}>
          {status === "connecting" ? "Conectando..." : "Conectar"}
        </button>

        {recent.length > 0 && (
          <div className="recent-list">
            <span className="recent-title">Recentes</span>
            {recent.map((c) => (
              <button
                type="button"
                key={`${c.host}:${c.port}`}
                className="recent-item"
                onClick={() => fillFromRecent(c)}
              >
                {c.username} @ {c.host}:{c.port}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
