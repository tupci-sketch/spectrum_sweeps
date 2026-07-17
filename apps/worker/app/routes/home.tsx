import { Link, useLoaderData } from "react-router";
import { competitions, leagues } from "@spectrum-sweeps/db";
import type { Route } from "./+types/home";
import { getDb } from "../../server/api/db";
import { cloudflareContext } from "../context";

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const db = getDb(env);
  const [allLeagues, allCompetitions] = await Promise.all([
    db.select().from(leagues).all(),
    db.select().from(competitions).all(),
  ]);
  return { leagues: allLeagues, competitions: allCompetitions };
}

export default function Home() {
  const { leagues: leagueRows, competitions: competitionRows } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Spectrum Sweepstakes</h1>
      <p className="mt-1 text-slate-400">Office tournament tracker.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Leagues</h2>
        <ul className="mt-2 space-y-1">
          {leagueRows.map((league) => (
            <li key={league.id} className="text-slate-300">
              {league.name} <span className="text-slate-500">({league.status})</span>
            </li>
          ))}
          {leagueRows.length === 0 && <li className="text-slate-500">No leagues yet.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Competitions</h2>
        <ul className="mt-2 space-y-1">
          {competitionRows.map((competition) => (
            <li key={competition.id}>
              <Link to={`/leaderboard/${competition.id}`} className="text-sky-400 hover:underline">
                {competition.name}
              </Link>{" "}
              <span className="text-slate-500">
                ({competition.formatType}, {competition.status})
              </span>
            </li>
          ))}
          {competitionRows.length === 0 && <li className="text-slate-500">No competitions yet.</li>}
        </ul>
      </section>
    </main>
  );
}
