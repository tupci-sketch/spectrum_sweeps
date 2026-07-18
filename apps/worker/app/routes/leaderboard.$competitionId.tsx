import { useLoaderData } from "react-router";
import type {
  KnockoutRow,
  SeasonLongRow,
  StandingsRow as PointsRow,
} from "../../server/scoring/types";
import type { Route } from "./+types/leaderboard.$competitionId";
import { API_BASE, apiGet } from "../api-client";

interface Competition {
  id: string;
  name: string;
  formatType: "knockout" | "season_long" | "standings";
}
interface SnapshotRow {
  snapshot: { rows: unknown[] };
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const competition = await apiGet<Competition>(`/api/admin/competitions/${params.competitionId}`);

  // The leaderboard endpoint 404s when no results have been entered yet — that's
  // a normal empty state, not an error, so don't let apiGet throw on it.
  const res = await fetch(`${API_BASE}/api/leaderboard/${params.competitionId}`);
  const snapshot = res.ok ? ((await res.json()) as SnapshotRow) : null;

  return { competition, snapshot };
}

export default function Leaderboard() {
  const { competition, snapshot } = useLoaderData<typeof clientLoader>();

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">{competition.name}</h1>
        <p className="mt-4 text-slate-500">No results entered yet.</p>
      </main>
    );
  }

  const rows = snapshot.snapshot.rows;

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
