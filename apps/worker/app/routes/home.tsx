import { Link, useLoaderData } from "react-router";
import { apiGet } from "../api-client";

interface LeagueRow {
  id: string;
  name: string;
  status: string;
}
interface CompetitionRow {
  id: string;
  name: string;
  formatType: string;
  status: string;
}

export async function clientLoader() {
  const [leagues, competitions] = await Promise.all([
    apiGet<LeagueRow[]>("/api/admin/leagues"),
    apiGet<CompetitionRow[]>("/api/admin/competitions"),
  ]);
  return { leagues, competitions };
}

export default function Home() {
  const { leagues, competitions } = useLoaderData<typeof clientLoader>();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Spectrum Sweepstakes</h1>
      <p className="mt-1 text-slate-400">Office tournament tracker.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Leagues</h2>
        <ul className="mt-2 space-y-1">
          {leagues.map((league) => (
            <li key={league.id} className="text-slate-300">
              {league.name} <span className="text-slate-500">({league.status})</span>
            </li>
          ))}
          {leagues.length === 0 && <li className="text-slate-500">No leagues yet.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Competitions</h2>
        <ul className="mt-2 space-y-1">
          {competitions.map((competition) => (
            <li key={competition.id}>
              <Link to={`/leaderboard/${competition.id}`} className="text-sky-400 hover:underline">
                {competition.name}
              </Link>{" "}
              <span className="text-slate-500">
                ({competition.formatType}, {competition.status})
              </span>
            </li>
          ))}
          {competitions.length === 0 && <li className="text-slate-500">No competitions yet.</li>}
        </ul>
      </section>
    </main>
  );
}
