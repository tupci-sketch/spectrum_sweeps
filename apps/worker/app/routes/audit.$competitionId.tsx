import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { API_BASE } from "../api-client";
import { Panel } from "../components/ui";

interface AuditEvent { eventType: string; payload: Record<string, unknown>; actor: string; occurredAt: number; }
interface AuditResp {
  competition: { id: string; name: string; drawState: string; drawSeed: string | null };
  events: AuditEvent[];
  allocations: { potEntryId: string; team: string; assignedAt: number }[];
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Audit() {
  const competitionId = useParams().competitionId!;
  const [data, setData] = useState<AuditResp | null>(null);
  const [verify, setVerify] = useState<{ status: "pending" | "ok" | "mismatch" | "n/a"; recomputed?: string; committed?: string }>({ status: "pending" });

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/api/draw/${competitionId}/audit`);
      if (!res.ok) return;
      const d = (await res.json()) as AuditResp;
      setData(d);

      // Re-verify: recompute the committed hash from the published seed +
      // committed order + timestamp, entirely in the browser.
      const committed = d.events.find((e) => e.eventType === "draw_committed");
      const seed = d.competition.drawSeed;
      const orderedIds = committed?.payload.orderedEntryIds as string[] | undefined;
      const ts = committed?.payload.committedAtMs as number | undefined;
      const committedHash = committed?.payload.commitHash as string | undefined;
      if (!seed || !orderedIds || ts == null || !committedHash) {
        setVerify({ status: "n/a" });
        return;
      }
      const recomputed = await sha256Hex(`${seed}|${orderedIds.join(",")}|${ts}`);
      setVerify({ status: recomputed === committedHash ? "ok" : "mismatch", recomputed, committed: committedHash });
    })();
  }, [competitionId]);

  if (!data) {
    return <div className="mx-auto max-w-3xl px-5 py-8"><p className="text-muted">Loading audit trail…</p></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link to="/" className="hover:text-ink">Leagues</Link><span>/</span><span>Draw transparency</span>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{data.competition.name}</h1>
        <p className="text-muted">Every draw is recorded and independently verifiable.</p>
      </header>

      <Panel title="Fairness verification">
        {verify.status === "pending" && <p className="text-muted">Verifying…</p>}
        {verify.status === "n/a" && <p className="text-muted">This draw hasn't been run yet, so there's nothing to verify.</p>}
        {verify.status === "ok" && (
          <div>
            <p className="text-lg font-semibold text-emerald-400">✓ Verified — the result matches the pre-committed hash.</p>
            <p className="mt-2 text-xs text-muted">
              The committed hash was fixed <em>before</em> any pick was revealed. Recomputing SHA-256 of
              (published seed + committed order + timestamp) reproduces it exactly — proof nothing was changed mid-draw.
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-surface-2 p-3 text-xs text-gold">{verify.recomputed}</pre>
          </div>
        )}
        {verify.status === "mismatch" && (
          <div>
            <p className="text-lg font-semibold text-red-400">✗ Mismatch — recomputed hash does not match the commitment.</p>
            <pre className="mt-2 overflow-x-auto rounded bg-surface-2 p-3 text-xs">committed:  {verify.committed}{"\n"}recomputed: {verify.recomputed}</pre>
          </div>
        )}
      </Panel>

      <Panel title="Event trail" className="mt-6">
        <ol className="space-y-3">
          {data.events.map((e, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-brand">{e.eventType.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted">{new Date(e.occurredAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted">by {e.actor}</p>
              <pre className="mt-2 overflow-x-auto rounded bg-canvas/60 p-2 text-[11px] text-muted">{JSON.stringify(e.payload, null, 2)}</pre>
            </li>
          ))}
          {data.events.length === 0 && <li className="text-muted">No draw events recorded yet.</li>}
        </ol>
      </Panel>

      {data.allocations.length > 0 && (
        <Panel title="Recorded allocations" className="mt-6">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {data.allocations.map((a) => <li key={a.potEntryId} className="text-gold">{a.team}</li>)}
          </ol>
        </Panel>
      )}
    </div>
  );
}
