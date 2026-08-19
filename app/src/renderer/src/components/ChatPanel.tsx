import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@renderer/store/chatStore";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { sendChat } from "@renderer/hooks/useSocket";
import { fileToCompressedDataUrl } from "@renderer/utils/imageCompression";

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.82;

export default function ChatPanel(): JSX.Element {
  const messages = useChatStore((s) => s.messages);
  const selfId = useConnectionStore((s) => s.selfId);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingImage]);

  async function attachFile(file: File | null | undefined): Promise<void> {
    if (!file || !file.type.startsWith("image/")) return;
    setSendingImage(true);
    try {
      setPendingImage(await fileToCompressedDataUrl(file, MAX_IMAGE_DIMENSION, IMAGE_JPEG_QUALITY));
    } catch (err) {
      console.error("[chat] falha ao processar imagem", err);
    } finally {
      setSendingImage(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    void attachFile(item.getAsFile());
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;
    sendChat(trimmed, pendingImage ?? undefined);
    setText("");
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="chat-panel">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div className="chat-message" key={`${m.ts}-${i}`}>
            <span className={m.id === selfId ? "chat-author chat-author-self" : "chat-author"}>
              {m.username}
            </span>
            {m.text && <span className="chat-text">{m.text}</span>}
            {m.image && (
              <div className="chat-image-wrap">
                <img className="chat-image" src={m.image} alt="imagem enviada no chat" />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {pendingImage && (
        <div className="chat-pending-image">
          <img src={pendingImage} alt="pré-visualização" />
          <button type="button" onClick={() => setPendingImage(null)}>
            Remover
          </button>
        </div>
      )}
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="chat-file-input"
          onChange={(e) => void attachFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="chat-attach-button"
          title="Enviar imagem"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Enviar mensagem..."
          maxLength={2000}
        />
        <button type="submit" disabled={sendingImage}>
          Enviar
        </button>
      </form>
    </section>
  );
}
