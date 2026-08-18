import { useEffect, useState } from "react";
import type { ScreenSource } from "../../../shared/types";
import { startScreenShare } from "@renderer/hooks/useMediaDevices";

type Props = {
  onClose: () => void;
};

export default function ScreenSharePicker({ onClose }: Props): JSX.Element {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getScreenSources().then(setSources);
  }, []);

  async function handlePick(sourceId: string): Promise<void> {
    try {
      await startScreenShare(sourceId);
      onClose();
    } catch {
      setError("Não foi possível iniciar o compartilhamento.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Escolha o que compartilhar</h2>
        {error && <p className="error-text">{error}</p>}
        <div className="source-grid">
          {sources.map((s) => (
            <button type="button" className="source-item" key={s.id} onClick={() => handlePick(s.id)}>
              <img src={s.thumbnailDataUrl} alt={s.name} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        <button type="button" className="modal-cancel" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
