import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@renderer/store/chatStore";
import { useConnectionStore } from "@renderer/store/connectionStore";
import { sendChat } from "@renderer/hooks/useSocket";

export default function ChatPanel(): JSX.Element {
  const messages = useChatStore((s) => s.messages);
  const selfId = useConnectionStore((s) => s.selfId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setText("");
  }

  return (
    <section className="chat-panel">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div className="chat-message" key={`${m.ts}-${i}`}>
            <span className={m.id === selfId ? "chat-author chat-author-self" : "chat-author"}>
              {m.username}
            </span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enviar mensagem..."
          maxLength={2000}
        />
        <button type="submit">Enviar</button>
      </form>
    </section>
  );
}
