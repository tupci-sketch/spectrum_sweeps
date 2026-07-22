import { Link, useLoaderData } from "react-router";
import type { KnockoutRow, SeasonLongRow, StandingsRow as PointsRow } from "../../server/scoring/types";
import type { Route } from "./+types/leaderboard.$competitionId";
import { API_BASE, apiGet } from "../api-client";
import { Panel, RankBadge, StatusPill, FormatTag } from "../components/ui";

interface Competition { id: string; name: string; formatType: "knockout" | "season_long" | "standings"; status: string; }
interface Snapshot { snapshot: { rows: unknown[] }; }
interface Participant { id: string; userId: string; }
interface User { id: string; nickname: string; }
interface Entry { id: string; teamOrDriverLabel: string; }
interface Assignment { participantId: string; potEntryId: string; }

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = params.competitionId;
  const [competition, participants, users, entries, assignments] = await Promise.all([
    apiGet<Competition>(`/api/admin/competitions/${id}`),
    apiGet<Participant[]>(`/api/admin/participants?competitionId=${id}`),
    apiGet<User[]>("/api/admin/users"),
    apiGet<Entry[]>(`/api/admin/draw/entries?competitionId=${id}`),
    apiGet<Assignment[]>(`/api/admin/draw/assignments?competitionId=${id}`),
  ]);
  // Empty leaderboard 404s before any result is entered — a normal empty state.
  const res = await fetch(`${API_BASE}/api/leaderboard/${id}`);
  const snapshot = res.ok ? ((await res.json()) as Snapshot) : null;
  return { competition, snapshot, participants, users, entries, assignments };
}

interface DisplayRow { rank: number; name: string; sub: string; metric: string; highlight: boolean; dim: boolean; }

export default function Leaderboard() {
  const { competition, snapshot, participants, users, entries, assignments } = useLoaderData<typeof clientLoader>();

  const nickOf = new Map(participants.map((p) => [p.id, users.find((u) => u.id === p.userId)?.nickname ?? "Player"]));
  const teamOf = new Map<string, string>();
  for (const a of assignments) {
    teamOf.set(a.participantId, entries.find((e) => e.id === a.potEntryId)?.teamOrDriverLabel ?? "—");
  }
  const name = (pid: string) => nickOf.get(pid) ?? pid.slice(0, 8);
  const team = (pid: string) => teamOf.get(pid) ?? "Awaiting draw";

  let rows: DisplayRow[] = [];
  if (snapshot) {
    const raw = snapshot.snapshot.rows;
    if (competition.formatType === "standings") {
      rows = (raw as PointsRow[]).map((r) => ({
        rank: r.rank, name: name(r.participantId), sub: team(r.participantId),
        metric: `${r.points} pts`, highlight: r.rank === 1, dim: false,
      }));
    } else if (competition.formatType === "season_long") {
      rows = [...(raw as SeasonLongRow[])]
        .sort((a, b) => Number(b.isChampion) - Number(a.isChampion) || (a.leaguePosition ?? 99) - (b.leaguePosition ?? 99))
        .map((r, i) => ({
          rank: i + 1, name: name(r.participantId), sub: team(r.participantId),
          metric: r.isChampion ? "🏆 Champion" : r.leaguePosition ? `Position ${r.leaguePosition}` : "—",
          highlight: r.isChampion, dim: false,
        }));
    } else {
      rows = [...(raw as KnockoutRow[])]
        .sort((a, b) => b.points - a.points)
        .map((r, i) => ({
          rank: i + 1, name: name(r.participantId), sub: team(r.participantId),
          metric: `${r.roundReached.replace(/_/g, " ")} · ${r.points} pts`,
          highlight: r.roundReached === "winner", dim: r.eliminated,
        }));
    }
  }

  // The draw roster: who holds which team/driver. This is the sweepstake's
  // state the moment the draw finishes, before any match result exists.
  const roster = assignments
    .map((a) => ({ name: name(a.participantId), team: team(a.participantId) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link to="/" className="hover:text-ink">Sweepstakes</Link><span>/</span>
            <FormatTag formatType={competition.formatType} />
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{competition.name}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={competition.status} />
          <Link to={`/draw/${competition.id}`} className="text-xs text-brand hover:underline">Draw room →</Link>
        </div>
      </header>

      {/* Draw roster — always shown once teams are allocated. */}
      {roster.length > 0 && (
        <Panel title={rows.length > 0 ? "Who's who" : "The draw — who got what"} icon={<BarsIcon />} className="mb-6">
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {roster.map((r) => (
              <li key={r.name} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                <span className="font-medium text-ink">{r.name}</span>
                <span className="text-gold">{r.team}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Leaderboard" icon={<BarsIcon />}>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-muted">
            {roster.length > 0
              ? "Teams are drawn — standings will appear here as match results are entered."
              : "The draw hasn't happened yet. Once it does, who's got which team shows here."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={`${r.rank}-${r.name}`}
                className={`flex items-center gap-3 py-2.5 ${r.dim ? "opacity-55" : ""}`}
              >
                <RankBadge rank={r.rank} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${r.highlight ? "text-gold" : "text-ink"}`}>{r.name}</p>
                  <p className="truncate text-xs text-muted">{r.sub}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${r.highlight ? "text-gold" : "text-ink"}`}>{r.metric}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Trust row — these are real properties of the draw engine, not marketing */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TrustTile title="Fair & random" body="Draws use cryptographic randomness — never a predictable shuffle." />
        <TrustTile title="Transparent" body="Every draw is recorded with a pre-committed hash before the reveal." />
        <TrustTile title="Verifiable" body="The published seed re-derives that hash, proving nothing was changed." />
      </div>
      <Link to={`/audit/${competition.id}`} className="mt-3 inline-block text-sm text-brand hover:underline">
        Inspect the full paper trail →
      </Link>
    </div>
  );
}

function TrustTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="text-sm font-semibold text-brand">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}
function BarsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
