import { useEffect, useRef, useState } from "react";
import { fetchChatStatus, openChatSocket, type ChatSocket } from "./api";
import { ChatStatus, WsEvent } from "./types";

interface ChatPanelProps {
  docId: string;
  docStatus: "draft" | "approved";
  onDocChanged: () => void;
}

type ChatMessage =
  | { kind: "user"; text: string; id: number }
  | { kind: "assistant"; text: string; streaming: boolean; id: number }
  | { kind: "info"; text: string; id: number }
  | { kind: "tool"; text: string; id: number }
  | { kind: "error"; text: string; id: number };

let counter = 0;
const nextId = (): number => ++counter;

export default function ChatPanel({ docId, docStatus, onDocChanged }: ChatPanelProps) {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [inFlight, setInFlight] = useState(false);
  const [mode, setMode] = useState<"interview" | "co-write" | undefined>(undefined);
  const socketRef = useRef<ChatSocket | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetchChatStatus().then((s) => alive && setStatus(s)).catch(() => {
      if (alive) setStatus({ available: false, reason: "could not reach /api/chat/status" });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!status?.available) return;
    const sock = openChatSocket(docId, (event) => handleEvent(event));
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, status?.available]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const appendAssistantDelta = (text: string): void => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.kind === "assistant" && last.streaming) {
        const updated: ChatMessage = { ...last, text: last.text + text };
        return [...prev.slice(0, -1), updated];
      }
      return [...prev, { kind: "assistant", text, streaming: true, id: nextId() }];
    });
  };

  const finishAssistant = (final?: string): void => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.kind === "assistant" && last.streaming) {
        const updated: ChatMessage = {
          ...last,
          streaming: false,
          text: final && final.length > last.text.length ? final : last.text,
        };
        return [...prev.slice(0, -1), updated];
      }
      if (final) return [...prev, { kind: "assistant", text: final, streaming: false, id: nextId() }];
      return prev;
    });
  };

  const handleEvent = (event: WsEvent): void => {
    switch (event.type) {
      case "chat.started":
        setInFlight(true);
        break;
      case "chat.info":
        if (event.reason) {
          setMessages((prev) => [...prev, { kind: "info", text: event.reason!, id: nextId() }]);
          if (event.reason.startsWith("mode: ")) {
            setMode(event.reason.slice(6) as "interview" | "co-write");
          }
        }
        break;
      case "chat.delta":
        if (event.text) appendAssistantDelta(event.text);
        break;
      case "chat.tool": {
        const t = event.tool;
        if (!t) break;
        const label =
          t.name === "mcp__specmanager__write_document"
            ? `tool: write_document`
            : t.name === "mcp__specmanager__read_document"
              ? `tool: read_document`
              : `tool: ${t.name}`;
        setMessages((prev) => [...prev, { kind: "tool", text: label, id: nextId() }]);
        // The doc just got rewritten by the agent — reload the editor's view.
        if (t.name === "mcp__specmanager__write_document") onDocChanged();
        break;
      }
      case "chat.done":
        finishAssistant(event.text);
        setInFlight(false);
        break;
      case "chat.error":
        finishAssistant();
        setMessages((prev) => [
          ...prev,
          { kind: "error", text: event.reason ?? "unknown error", id: nextId() },
        ]);
        setInFlight(false);
        break;
      case "chat.cancelled":
        finishAssistant();
        setInFlight(false);
        break;
      default:
        break;
    }
  };

  const send = (): void => {
    const text = input.trim();
    if (!text || inFlight || !socketRef.current || !status?.available) return;
    setMessages((prev) => [...prev, { kind: "user", text, id: nextId() }]);
    setInput("");
    socketRef.current.send(text, mode);
  };

  const cancel = (): void => {
    socketRef.current?.cancel();
  };

  if (!status) {
    return <div className="chat chat--loading">Checking chat backend…</div>;
  }
  if (!status.available) {
    return (
      <div className="chat chat--unavailable">
        <strong>Chat unavailable.</strong>
        <p>{status.reason ?? "no API credential found"}</p>
      </div>
    );
  }

  return (
    <div className="chat">
      <header className="chat__header">
        <strong>Chat</strong>
        {mode && <span className={`badge badge--meta`}>{mode}</span>}
        {docStatus === "approved" && (
          <span className="badge badge--stale" title="approved docs are read-only">read-only</span>
        )}
      </header>
      <div className="chat__messages" ref={scrollerRef}>
        {messages.length === 0 && (
          <div className="chat__empty">
            {docStatus === "approved"
              ? "Reopen the doc to chat about edits, or ask questions about its current state."
              : "Ask anything — the agent can read this doc, browse the repo, and persist edits via write_document."}
          </div>
        )}
        {messages.map((m) => (
          <MessageView key={m.id} message={m} />
        ))}
      </div>
      <div className="chat__composer">
        <textarea
          rows={2}
          placeholder={docStatus === "approved" ? "Read-only — reopen to edit." : "Message the agent…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {inFlight ? (
          <button className="btn" onClick={cancel}>Cancel</button>
        ) : (
          <button className="btn btn--primary" onClick={send} disabled={!input.trim()}>
            Send
          </button>
        )}
      </div>
    </div>
  );
}

function MessageView({ message }: { message: ChatMessage }) {
  return (
    <div className={`msg msg--${message.kind}`}>
      <span className="msg__label">{labelFor(message.kind)}</span>
      <div className="msg__body">{message.text}</div>
      {message.kind === "assistant" && message.streaming && (
        <span className="msg__caret" aria-hidden>▋</span>
      )}
    </div>
  );
}

function labelFor(kind: ChatMessage["kind"]): string {
  switch (kind) {
    case "user": return "You";
    case "assistant": return "Agent";
    case "info": return "info";
    case "tool": return "tool";
    case "error": return "error";
  }
}
