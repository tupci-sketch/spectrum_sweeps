import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { API_BASE, apiPost } from "../api-client";
import { useAuth } from "../auth";
import { Panel } from "./ui";

interface Msg { id: string; body: string; author: string; authorId: string; createdAt: number; }

// Per-draw chat, polled every ~2s (same near-live model as the draw room).
export function ChatBox({ competitionId }: { competitionId: string }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/social/chat?competitionId=${competitionId}`);
      if (res.ok) setMsgs((await res.json()) as Msg[]);
    } catch {
      /* transient */
    }
  }, [competitionId]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => { endRef.current?.scrollIntoView(); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await apiPost("/api/social/chat", { competitionId, body: text });
      setText("");
      await poll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Draw chat">
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {msgs.map((m) => (
          <div key={m.id} className="text-sm">
            <Link to={`/u/${m.authorId}`} className="font-medium text-brand hover:underline">{m.author}</Link>
            <span className="ml-2 text-slate-300">{m.body}</span>
          </div>
        ))}
        {msgs.length === 0 && <p className="text-sm text-muted">No messages yet — say hello 👋</p>}
        <div ref={endRef} />
      </div>
      {user ? (
        <form className="mt-3 flex gap-2" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message the room…"
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hi disabled:opacity-50">Send</button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted"><Link to="/login" className="text-brand hover:underline">Log in</Link> to join the chat.</p>
      )}
    </Panel>
  );
}
