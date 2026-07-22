import { Link, useLoaderData } from "react-router";
import { apiGet } from "../api-client";
import { Panel, StatTile, StatusPill, FormatTag } from "../components/ui";

interface Sweepstake {
  id: string; name: string; formatType: string; status: string; drawState: string;
  targetEntryCount: number; stake: string | null; prizePool: string | null; groupName: string | null;
}

export async function clientLoader() {
  const sweepstakes = await apiGet<Sweepstake[]>("/api/admin/sweepstakes");
  return { sweepstakes };
}

export default function Home() {
  const { sweepstakes } = useLoaderData<typeof clientLoader>();
  const live = sweepstakes.filter((s) => s.drawState === "live" || s.status === "active").length;
  const groups = new Set(sweepstakes.map((s) => s.groupName).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sweepstakes</h1>
          <p className="mt-1 text-muted">Year-round office sweepstakes — knockout, season-long and standings.</p>
        </div>
        <Link to="/admin" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hi">
          + New sweepstake
        </Link>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Sweepstakes" value={sweepstakes.length} />
        <StatTile label="Groups" value={groups} />
        <StatTile label="Live / active" value={live} accent="gold" />
      </div>

      {sweepstakes.length === 0 ? (
        <Panel title="No sweepstakes yet" icon={<TrophyIcon />}>
          <p className="text-muted">
            Head to <Link to="/admin" className="text-brand hover:underline">Admin</Link> to create your first one —
            pick an event (like the Premier League), a group, and a stake, and you're away.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sweepstakes.map((s) => {
            const drawing = s.drawState === "scheduled" || s.drawState === "live";
            return (
              <div key={s.id} className="rounded-xl border border-border bg-surface/70 p-4 transition hover:border-brand/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-ink">{s.name}</h2>
                    <p className="text-xs text-muted">{s.groupName ?? "—"} · {s.targetEntryCount} slots</p>
                  </div>
                  <StatusPill status={drawing ? s.drawState : s.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <FormatTag formatType={s.formatType} />
                  {s.stake && <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">stake {s.stake}</span>}
                  {s.prizePool && <span className="rounded bg-gold/10 px-2 py-0.5 text-xs text-gold">{s.prizePool}</span>}
                </div>
                <div className="mt-3 flex gap-3 border-t border-border pt-3 text-sm">
                  <Link to={`/leaderboard/${s.id}`} className="text-brand hover:underline">Leaderboard</Link>
                  <Link to={`/draw/${s.id}`} className="text-muted hover:text-ink hover:underline">
                    {s.drawState === "live" ? "● Draw room (live)" : s.drawState === "completed" ? "Draw result" : "Draw room"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}
