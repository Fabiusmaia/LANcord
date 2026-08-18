import { useEffect, useState } from "react";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { connect } from "@renderer/hooks/useSocket";
import type { RecentConnection } from "../../../shared/types";

export default function ConnectScreen(): JSX.Element {
  const status = useConnectionStore((s) => s.status);
  const error = useConnectionStore((s) => s.error);
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [recent, setRecent] = useState<RecentConnection[]>([]);

  useEffect(() => {
    window.electronAPI.getRecentConnections().then(setRecent);
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!username.trim() || !address.trim()) return;

    await window.electronAPI.addRecentConnection({
      address: address.trim(),
      username: username.trim(),
      lastUsedAt: Date.now(),
    });
    void connect(address.trim(), username.trim());
  }

  function fillFromRecent(c: RecentConnection): void {
    setUsername(c.username);
    setAddress(c.address);
  }

  return (
    <div className="connect-screen">
      <form className="connect-card" onSubmit={handleSubmit}>
        <h1>DiscordLAN</h1>
        <p className="subtitle">Conecte-se ao servidor de um amigo (IP na LAN/Radmin ou link de tunnel).</p>

        <label>
          Seu nome
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} required />
        </label>

        <label>
          Endereço do servidor
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="26.x.x.x:3001 ou https://algo.trycloudflare.com"
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={status === "connecting"}>
          {status === "connecting" ? "Conectando..." : "Conectar"}
        </button>

        {recent.length > 0 && (
          <div className="recent-list">
            <span className="recent-title">Recentes</span>
            {recent.map((c) => (
              <button type="button" key={c.address} className="recent-item" onClick={() => fillFromRecent(c)}>
                {c.username} @ {c.address}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
