import { useState } from "react";
import { useMediaStore } from "@renderer/store/mediaStore";
import { toggleDeafen, toggleMute, stopScreenShare } from "@renderer/hooks/useMediaDevices";
import { disconnect } from "@renderer/hooks/useSocket";
import ScreenSharePicker from "@renderer/components/ScreenSharePicker";

export default function ControlBar(): JSX.Element {
  const muted = useMediaStore((s) => s.muted);
  const deafened = useMediaStore((s) => s.deafened);
  const sharing = useMediaStore((s) => s.sharing);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <footer className="control-bar">
      <button type="button" className={muted ? "control-btn active" : "control-btn"} onClick={toggleMute}>
        {muted ? "🔇 Mudo" : "🎙️ Mic"}
      </button>
      <button type="button" className={deafened ? "control-btn active" : "control-btn"} onClick={toggleDeafen}>
        {deafened ? "🔕 Surdo" : "🔊 Áudio"}
      </button>
      <button
        type="button"
        className={sharing ? "control-btn active" : "control-btn"}
        onClick={() => (sharing ? stopScreenShare() : setPickerOpen(true))}
      >
        {sharing ? "🛑 Parar tela" : "🖥️ Compartilhar tela"}
      </button>
      <button type="button" className="control-btn control-btn-danger" onClick={disconnect}>
        ❌ Sair
      </button>

      {pickerOpen && <ScreenSharePicker onClose={() => setPickerOpen(false)} />}
    </footer>
  );
}
