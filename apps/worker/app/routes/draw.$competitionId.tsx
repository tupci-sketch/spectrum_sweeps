import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { API_BASE, apiPost, apiErrorMessage } from "../api-client";
import { useAuth } from "../auth";
import { Panel, StatusPill } from "../components/ui";
import { ChatBox } from "../components/ChatBox";
import { SpinWheel, type WheelSegment } from "../components/SpinWheel";
import { Confetti } from "../components/Confetti";
import { TeamCrest } from "../components/TeamCrest";
import { sounds } from "../lib/sounds";

interface Reveal { participantId: string; potEntryId: string; nickname: string; team: string; crestUrl: string | null; competitorNumber: number | null; }

interface DrawStateResp {
  competition: { id: string; name: string; formatType: string; drawState: string; drawScheduledAt: number | null };
  totalParticipants: number;
  revealedCount: number;
  complete: boolean;
  upNext: string | null;
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
  const [countdown, setCountdown] = useState<number | null>(null);
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
        sounds.spinTicks(); // decelerating ticks while the wheel turns
      }
      // Fire the celebration once, ~when the final pick's wheel settles.
      if (data.complete && !wasComplete.current && prevCount.current > 0) {
        wasComplete.current = true;
        setTimeout(() => { setCelebrate(true); sounds.fanfare(); }, 4200);
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

  // Owner spins: 3-2-1 countdown (with beeps) then trigger the reveal.
  async function runSpin() {
    if (busy || countdown !== null) return;
    sounds.unlock();
    for (const k of [3, 2, 1]) {
      setCountdown(k);
      sounds.countdown(k);
      await new Promise((r) => setTimeout(r, 850));
    }
    setCountdown(null);
    sounds.go();
    await act("/api/draw/spin");
  }

  function onLanded() {
    setSpinningNow(false);
    sounds.reveal();
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
                  <div className="relative mb-4">
                    <SpinWheel
                      segments={state.entries}
                      targetId={wheel.targetId}
                      spinToken={wheel.token}
                      onLanded={onLanded}
                    />
                    {/* 3-2-1 countdown overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 z-30 grid place-items-center rounded-full">
                        <div className="grid h-40 w-40 place-items-center rounded-full bg-black/70 backdrop-blur-sm">
                          <span key={countdown} className="animate-[spectrum-pop_0.85s_ease-out] text-7xl font-black text-gold drop-shadow-lg">
                            {countdown}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {state.complete ? "Draw complete" : `Pick ${state.revealedCount + (countdown !== null ? 1 : 0)} of ${state.totalParticipants}`}
                  </p>

                  {/* During the countdown, announce who's up. */}
                  {countdown !== null && state.upNext && (
                    <div className="mt-2">
                      <p className="text-sm uppercase tracking-wide text-muted">Up next</p>
                      <p className="text-3xl font-black text-ink">{state.upNext}</p>
                    </div>
                  )}

                  {/* During/after the spin, the entrant then their club. */}
                  {countdown === null && flash && !state.complete && (
                    <div className="mt-2">
                      <p className="text-2xl font-extrabold text-ink">{flash.nickname}</p>
                      {spinningNow ? (
                        <p className="text-lg text-muted">is up… 🎡 <span className="animate-pulse">spinning</span></p>
                      ) : (
                        <p className="flex items-center justify-center gap-2 text-xl font-semibold text-gold">
                          drew <TeamCrest label={flash.team} crestUrl={flash.crestUrl} number={flash.competitorNumber} size={30} /> {flash.team}
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
              <div className="mt-5 flex flex-col items-center gap-2">
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
                  <>
                    {state.upNext && countdown === null && !spinningNow && (
                      <p className="text-sm text-muted">Up next: <span className="font-semibold text-ink">{state.upNext}</span></p>
                    )}
                    <button
                      onClick={runSpin}
                      disabled={busy || countdown !== null || spinningNow}
                      className="rounded-lg bg-brand px-10 py-3.5 text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-brand/30 hover:bg-brand-hi disabled:opacity-50"
                    >
                      {countdown !== null ? countdown : spinningNow ? "Spinning…" : "Spin"}
                    </button>
                  </>
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
                    <span className="flex items-center gap-2 font-medium text-gold">
                      <TeamCrest label={r.team} crestUrl={r.crestUrl} number={r.competitorNumber} size={24} /> {r.team}
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
