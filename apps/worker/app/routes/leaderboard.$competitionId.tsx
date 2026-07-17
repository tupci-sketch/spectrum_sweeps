import { useLoaderData } from "react-router";
import { desc, eq } from "drizzle-orm";
import { competitions, standingsSnapshots } from "@spectrum-sweeps/db";
import type {
  KnockoutRow,
  SeasonLongRow,
  StandingsRow as PointsRow,
} from "../../server/scoring/types";
import type { Route } from "./+types/leaderboard.$competitionId";
import { getDb } from "../../server/api/db";
import { cloudflareContext } from "../context";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const db = getDb(env);
  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, params.competitionId))
    .all();
  if (!competition) throw new Response("Competition not found", { status: 404 });

  const [snapshot] = await db
    .select()
    .from(standingsSnapshots)
    .where(eq(standingsSnapshots.competitionId, params.competitionId))
    .orderBy(desc(standingsSnapshots.computedAt))
    .limit(1)
    .all();

  return { competition, snapshot: snapshot ?? null };
}

export default function Leaderboard() {
  const { competition, snapshot } = useLoaderData<typeof loader>();

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">{competition.name}</h1>
        <p className="mt-4 text-slate-500">No results entered yet.</p>
      </main>
    );
  }

  const rows = (snapshot.snapshot as { rows: unknown[] }).rows;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">{competition.name}</h1>
      <p className="text-slate-500">Format: {competition.formatType}</p>

      <table className="mt-6 w-full text-left">
        <tbody>
          {competition.formatType === "knockout" &&
            (rows as KnockoutRow[]).map((row) => (
              <tr key={row.participantId} className="border-b border-slate-800">
                <td className="py-2">{row.participantId}</td>
                <td className="py-2 text-slate-400">{row.roundReached}</td>
                <td className="py-2">{row.eliminated ? "Eliminated" : "Still in"}</td>
                <td className="py-2 text-right">{row.points} pts</td>
              </tr>
            ))}
          {competition.formatType === "season_long" &&
            (rows as SeasonLongRow[]).map((row) => (
              <tr key={row.participantId} className="border-b border-slate-800">
                <td className="py-2">{row.participantId}</td>
                <td className="py-2 text-slate-400">{row.leaguePosition ?? "—"}</td>
                <td className="py-2 text-right">{row.isChampion ? "Champion" : ""}</td>
              </tr>
            ))}
          {competition.formatType === "standings" &&
            (rows as PointsRow[]).map((row) => (
              <tr key={row.participantId} className="border-b border-slate-800">
                <td className="py-2">#{row.rank}</td>
                <td className="py-2">{row.participantId}</td>
                <td className="py-2 text-right">{row.points} pts</td>
              </tr>
            ))}
        </tbody>
      </table>
    </main>
  );
}
