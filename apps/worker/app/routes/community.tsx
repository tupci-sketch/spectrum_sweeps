import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet, apiPost } from "../api-client";
import { useAuth } from "../auth";
import { Panel } from "../components/ui";
import { Button, ErrorText, Field, useSubmit } from "../admin-ui";

interface Poll { id: string; question: string; options: string[]; counts: number[]; total: number; myVote: number | null; }
interface Thread { id: string; title: string; author: string; replies: number; createdAt: number; }
interface Post { id: string; body: string; author: string; authorId: string; createdAt: number; }

export default function Community() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8 space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Community</h1>
        <p className="text-muted">Polls and discussions for the office.</p>
      </header>
      {!user && <p className="rounded-lg bg-surface/60 p-3 text-sm text-muted">Log in to vote and post.</p>}
      <Polls canCreate={(user?.level ?? 0) >= 5} loggedIn={!!user} />
      <Discussions loggedIn={!!user} />
    </div>
  );
}

function Polls({ canCreate, loggedIn }: { canCreate: boolean; loggedIn: boolean }) {
  const { run, error, busy } = useSubmit();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState("");

  const load = () => apiGet<Poll[]>("/api/social/polls").then(setPolls).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <Panel title="Polls">
      {canCreate && (
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => apiPost("/api/social/polls", { question: q, options: opts.split(",").map((o) => o.trim()).filter(Boolean) }),
              () => { setQ(""); setOpts(""); load(); },
            );
          }}
        >
          <Field label="Question" value={q} onChange={(e) => setQ(e.target.value)} required />
          <Field label="Options (comma-separated)" value={opts} onChange={(e) => setOpts(e.target.value)} required placeholder="Yes, No, Maybe" />
          <Button disabled={busy}>Create poll</Button>
          <ErrorText>{error}</ErrorText>
        </form>
      )}
      <ul className="space-y-4">
        {polls.map((p) => (
          <li key={p.id} className="rounded-lg border border-border bg-surface-2/30 p-3">
            <p className="font-medium">{p.question}</p>
            <ul className="mt-2 space-y-1.5">
              {p.options.map((opt, i) => {
                const pct = p.total ? Math.round((p.counts[i] / p.total) * 100) : 0;
                const mine = p.myVote === i;
                return (
                  <li key={i}>
                    <button
                      disabled={!loggedIn}
                      onClick={() => loggedIn && run(() => apiPost(`/api/social/polls/${p.id}/vote`, { optionIndex: i }), load)}
                      className={`relative block w-full overflow-hidden rounded border px-3 py-1.5 text-left text-sm ${mine ? "border-brand" : "border-border"} disabled:cursor-default`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-brand/20" style={{ width: `${pct}%` }} />
                      <span className="relative flex justify-between">
                        <span>{mine ? "● " : ""}{opt}</span>
                        <span className="text-muted">{pct}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-muted">{p.total} vote{p.total === 1 ? "" : "s"}</p>
          </li>
        ))}
        {polls.length === 0 && <li className="text-muted">No polls yet.</li>}
      </ul>
    </Panel>
  );
}

function Discussions({ loggedIn }: { loggedIn: boolean }) {
  const { run, error, busy } = useSubmit();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState("");

  const load = () => apiGet<Thread[]>("/api/social/threads").then(setThreads).catch(() => {});
  useEffect(() => { load(); }, []);
  const openThread = (id: string) => {
    setOpenId(id);
    apiGet<{ posts: Post[] }>(`/api/social/threads/${id}`).then((d) => setPosts(d.posts)).catch(() => {});
  };

  return (
    <Panel title="Discussions">
      {loggedIn && (
        <form
          className="mb-4 flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); run(() => apiPost("/api/social/threads", { title }), () => { setTitle(""); load(); }); }}
        >
          <div className="flex-1"><Field label="Start a discussion" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <Button disabled={busy}>Post</Button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id} className="rounded-lg border border-border bg-surface-2/30 p-3">
            <button onClick={() => (openId === t.id ? setOpenId(null) : openThread(t.id))} className="flex w-full items-center justify-between text-left">
              <span className="font-medium">{t.title}</span>
              <span className="text-xs text-muted">{t.author} · {t.replies} repl{t.replies === 1 ? "y" : "ies"}</span>
            </button>
            {openId === t.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {posts.map((p) => (
                  <div key={p.id} className="text-sm">
                    <Link to={`/u/${p.authorId}`} className="font-medium text-brand hover:underline">{p.author}</Link>
                    <span className="ml-2 text-xs text-muted">{new Date(p.createdAt).toLocaleString()}</span>
                    <p className="text-slate-300">{p.body}</p>
                  </div>
                ))}
                {posts.length === 0 && <p className="text-sm text-muted">No replies yet.</p>}
                {loggedIn && (
                  <form
                    className="flex items-end gap-2 pt-1"
                    onSubmit={(e) => { e.preventDefault(); run(() => apiPost(`/api/social/threads/${t.id}/posts`, { body: reply }), () => { setReply(""); openThread(t.id); load(); }); }}
                  >
                    <div className="flex-1"><Field label="" value={reply} onChange={(e) => setReply(e.target.value)} required placeholder="Reply…" /></div>
                    <Button disabled={busy}>Reply</Button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
        {threads.length === 0 && <li className="text-muted">No discussions yet.</li>}
      </ul>
    </Panel>
  );
}
