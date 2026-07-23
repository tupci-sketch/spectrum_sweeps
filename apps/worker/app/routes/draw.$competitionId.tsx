import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { API_BASE, apiPost, apiErrorMessage } from "../api-client";
import { useAuth } from "../auth";
import { Panel, StatusPill } from "../components/ui";
import { ChatBox } from "../components/ChatBox";
import { SpinWheel, type WheelSegment } from "../components/SpinWheel";
import { Confetti } from "../components/Confetti";

interface Reveal { participantId: string; potEntryId: string; nickname: string; team: string; crestUrl: string | null; competitorNumber: number | null; }

function Crest({ url, number, size = 24 }: { url: string | null; number: number | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="inline-block object-contain align-middle" />;
  if (number != null) return <span className="inline-grid place-items-center rounded bg-surface-2 px-1 text-xs font-bold text-gold" style={{ minWidth: size, height: size }}>{number}</span>;
  return null;
}
interface DrawStateResp {
  competition: { id: string; name: string; formatType: string; drawState: string; drawScheduledAt: number | null };
  totalParticipants: number;
  revealedCount: number;
  complete: boolean;
  reveals: Reveal[];
  entries: WheelSegment[];
}

export default function DrawRoom() {
  const competitionId = useParams().competitionId!;
  const { user } = useAuth();
  const [state, setState] = useState<DrawStateResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prevCount = useRef(0);
  const [flash, setFlash] = useState<Reveal | null>(null);
  // Spin-wheel: bump the token + set the target whenever a new pick lands, so
  // every watcher's wheel spins to the same team at ~the same moment.
  const [wheel, setWheel] = useState<{ targetId: string | null; token: number }>({ targetId: null, token: 0 });
  const [celebrate, setCelebrate] = useState(false);
  const [spinningNow, setSpinningNow] = useState(false);
  const wasComplete = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/draw/${competitionId}/state`);
      if (!res.ok) return;
      const data = (await res.json()) as DrawStateResp;
      setState(data);
      if (data.revealedCount > prevCount.current && data.reveals.length) {
        const latest = data.reveals[data.reveals.length - 1];
        setFlash(latest);
        setSpinningNow(true); // hide the team until the wheel lands on it
        setWheel((w) => ({ targetId: latest.potEntryId, token: w.token + 1 }));
      }
      // Fire the celebration once, ~when the final pick's wheel settles.
      if (data.complete && !wasComplete.current && prevCount.current > 0) {
        wasComplete.current = true;
        setTimeout(() => setCelebrate(true), 4200);
      }
      prevCount.current = data.revealedCount;
    } catch {
      /* transient */
    }
  }, [competitionId]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 1200);
    return () => clearInterval(id);
  }, [poll]);

  const isOwner = (user?.level ?? 0) >= 7;
  const c = state?.competition;

  async function act(path: string) {
    setBusy(true);
    setError(null);
    try {
      await apiPost(path, { competitionId });
      await poll();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <Confetti fire={celebrate} />
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link to="/" className="hover:text-ink">Sweepstakes</Link><span>/</span><span>Draw room</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{c?.name ?? "Draw"}</h1>
        </div>
        {c && <StatusPill status={c.drawState} />}
      </header>

      {!state ? (
        <p className="text-muted">Loading draw…</p>
      ) : (
        <>
          {/* Big reveal stage */}
          <Panel title="The draw">
            {c?.drawState === "not_scheduled" && (
              <p className="py-6 text-center text-muted">This draw hasn't been scheduled yet.</p>
            )}
            {c?.drawState === "scheduled" && (
              <div className="py-6 text-center">
                <p className="text-muted">Draw scheduled for</p>
                <p className="mt-1 text-xl font-semibold text-gold">
                  {c.drawScheduledAt ? new Date(c.drawScheduledAt).toLocaleString() : "—"}
                </p>
                <p className="mt-2 text-sm text-muted">{state.totalParticipants} entrants waiting.</p>
              </div>
            )}
            {(c?.drawState === "live" || c?.drawState === "completed") && (
              <div>
                {!state.complete && (
                  <div className="mb-4">
                    <SpinWheel
                      segments={state.entries}
                      targetId={wheel.targetId}
                      spinToken={wheel.token}
                      onLanded={() => setSpinningNow(false)}
                    />
                  </div>
                )}
                <div className="mb-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {state.complete ? "Draw complete" : `Pick ${state.revealedCount} of ${state.totalParticipants}`}
                  </p>
                  {flash && !state.complete && (
                    <div className="mt-2">
                      <p className="text-2xl font-extrabold text-ink">{flash.nickname}</p>
                      {spinningNow ? (
                        <p className="text-lg text-muted">is up… 🎡 <span className="animate-pulse">spinning</span></p>
                      ) : (
                        <p className="flex items-center justify-center gap-2 text-lg text-gold">
                          drew <Crest url={flash.crestUrl} number={flash.competitorNumber} size={28} /> {flash.team}
                        </p>
                      )}
                    </div>
                  )}
                  {state.complete && <p className="mt-2 text-lg font-semibold text-gold">🏆 All allocations revealed</p>}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-brand transition-all"
                    style={{ width: `${(state.revealedCount / Math.max(1, state.totalParticipants)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {isOwner && (
              <div className="mt-5 flex justify-center gap-3">
                {c?.drawState === "scheduled" && (
                  <button
                    onClick={() => act("/api/draw/start")}
                    disabled={busy}
                    className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hi disabled:opacity-50"
                  >
                    Start the draw
                  </button>
                )}
                {c?.drawState === "live" && !state.complete && (
                  <button
                    onClick={() => act("/api/draw/spin")}
                    disabled={busy}
                    className="rounded-lg bg-brand px-8 py-3 text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-brand/30 hover:bg-brand-hi disabled:opacity-50"
                  >
                    {busy ? "Spinning…" : "Spin"}
                  </button>
                )}
              </div>
            )}
            {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
          </Panel>

          {/* Allocation table (continuous record) */}
          {state.reveals.length > 0 && (
            <Panel title="Allocations" className="mt-6">
              <ul className="divide-y divide-border">
                {state.reveals.map((r, i) => (
                  <li key={r.participantId} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs text-muted">{i + 1}</span>
                      <span className="font-medium">{r.nickname}</span>
                    </span>
                    <span className="flex items-center gap-2 text-gold">
                      <Crest url={r.crestUrl} number={r.competitorNumber} /> {r.team}
                    </span>
                  </li>
                ))}
              </ul>
              {state.complete && (
                <div className="mt-4 flex gap-4">
                  <Link to={`/leaderboard/${competitionId}`} className="text-brand hover:underline">View leaderboard →</Link>
                  <Link to={`/audit/${competitionId}`} className="text-muted hover:text-ink hover:underline">Verify this draw →</Link>
                </div>
              )}
            </Panel>
          )}

          <div className="mt-6">
            <ChatBox competitionId={competitionId} />
          </div>
        </>
      )}
    </div>
  );
}
