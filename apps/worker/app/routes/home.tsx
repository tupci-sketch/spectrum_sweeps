import { Link, useLoaderData } from "react-router";
import { apiGet } from "../api-client";
import { Panel, StatTile, StatusPill, FormatTag } from "../components/ui";

interface LeagueRow { id: string; name: string; status: string; }
interface CompetitionRow { id: string; name: string; formatType: string; status: string; targetEntryCount: number; }

export async function clientLoader() {
  const [leagues, competitions] = await Promise.all([
    apiGet<LeagueRow[]>("/api/admin/leagues"),
    apiGet<CompetitionRow[]>("/api/admin/competitions"),
  ]);
  return { leagues, competitions };
}

export default function Home() {
  const { leagues, competitions } = useLoaderData<typeof clientLoader>();
  const active = competitions.filter((c) => c.status === "active").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Leagues</h1>
        <p className="mt-1 text-muted">Year-round office sweepstakes — knockout, season-long and standings.</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Leagues" value={leagues.length} />
        <StatTile label="Competitions" value={competitions.length} />
        <StatTile label="Live now" value={active} accent="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Competitions" icon={<TrophyIcon />}>
          <ul className="space-y-2">
            {competitions.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/leaderboard/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 transition hover:border-border hover:bg-surface-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <FormatTag formatType={c.formatType} />
                  </span>
                  <StatusPill status={c.status} />
                </Link>
              </li>
            ))}
            {competitions.length === 0 && <li className="text-muted">No competitions yet.</li>}
          </ul>
        </Panel>

        <Panel title="Leagues" icon={<ShieldIcon />}>
          <ul className="space-y-2">
            {leagues.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3 py-2.5">
                <span className="font-medium">{l.name}</span>
                <StatusPill status={l.status} />
              </li>
            ))}
            {leagues.length === 0 && (
              <li className="text-muted">
                No leagues yet — <Link to="/admin" className="text-brand hover:underline">set one up in Admin</Link>.
              </li>
            )}
          </ul>
        </Panel>
      </div>
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
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3z" />
    </svg>
  );
}
