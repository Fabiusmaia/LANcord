import { useEffect, useState } from "react";
import { useRoomStore } from "@renderer/store/roomStore";
import { createRoom, disconnect, joinRoom, listRooms } from "@renderer/hooks/useSocket";
import type { Room } from "@renderer/types";

export default function RoomRail(): JSX.Element {
  const rooms = useRoomStore((s) => s.rooms);
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const error = useRoomStore((s) => s.error);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Room | null>(null);

  useEffect(() => {
    listRooms();
  }, []);

  function handlePick(room: Room): void {
    if (room.id === currentRoom?.id) return;
    if (room.hasPassword) setPasswordTarget(room);
    else joinRoom(room.id);
  }

  return (
    <nav className="room-rail">
      <div className="room-rail-title">Salas</div>
      {error && <p className="error-text room-rail-error">{error}</p>}
      <div className="room-rail-list">
        {rooms.map((room) => (
          <button
            type="button"
            key={room.id}
            className={room.id === currentRoom?.id ? "room-rail-item active" : "room-rail-item"}
            onClick={() => handlePick(room)}
            title={room.name}
          >
            <span className="room-rail-icon">{room.hasPassword ? "🔒" : "#"}</span>
            <span className="room-rail-name">{room.name}</span>
          </button>
        ))}
      </div>
      <button type="button" className="room-rail-create" onClick={() => setCreateOpen(true)}>
        + Criar sala
      </button>
      <button type="button" className="room-rail-disconnect" onClick={disconnect}>
        ❌ Sair do servidor
      </button>

      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} />}
      {passwordTarget && <PasswordModal room={passwordTarget} onClose={() => setPasswordTarget(null)} />}
    </nav>
  );
}

function CreateRoomModal({ onClose }: { onClose: () => void }): JSX.Element {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom(name.trim(), password.trim() || undefined);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Criar sala</h2>
        <label>
          Nome da sala
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={48} autoFocus required />
        </label>
        <label>
          Senha (opcional)
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </label>
        <button type="submit">Criar e entrar</button>
        <button type="button" className="modal-cancel" onClick={onClose}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

function PasswordModal({ room, onClose }: { room: Room; onClose: () => void }): JSX.Element {
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    joinRoom(room.id, password);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Senha de "{room.name}"</h2>
        <label>
          Senha
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoFocus
            required
          />
        </label>
        <button type="submit">Entrar</button>
        <button type="button" className="modal-cancel" onClick={onClose}>
          Cancelar
        </button>
      </form>
    </div>
  );
}
