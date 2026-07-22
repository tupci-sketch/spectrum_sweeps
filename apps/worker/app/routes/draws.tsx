import { Link, useLoaderData } from "react-router";
import { apiGet } from "../api-client";
import { Panel } from "../components/ui";

interface CompetitionRow { id: string; name: string; formatType: string; status: string; drawState: string; drawScheduledAt: number | null; }

export async function clientLoader() {
  const competitions = await apiGet<CompetitionRow[]>("/api/admin/competitions");
  return { competitions };
}

const LABEL: Record<string, string> = {
  live: "Live now",
  scheduled: "Scheduled",
  completed: "Completed",
  not_scheduled: "Not scheduled yet",
};

export default function Draws() {
  const { competitions } = useLoaderData<typeof clientLoader>();
  const order = ["live", "scheduled", "not_scheduled", "completed"];
  const groups = order
    .map((state) => ({ state, items: competitions.filter((c) => c.drawState === state) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Spin Wheel</h1>
        <p className="mt-1 text-muted">
          Every draw is held live here — an owner spins the wheel and each entrant's team/driver is revealed in sync.
        </p>
      </header>

      {competitions.length === 0 && (
        <Panel title="No draws yet">
          <p className="text-muted">
            Create a competition in <Link to="/admin" className="text-brand hover:underline">Admin</Link>, add entrants,
            then start the draw — it'll appear here.
          </p>
        </Panel>
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <Panel key={g.state} title={LABEL[g.state] ?? g.state}>
            <ul className="divide-y divide-border">
              {g.items.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.drawState === "live" && <span className="text-xs text-brand">● live</span>}
                    {c.drawState === "scheduled" && c.drawScheduledAt && (
                      <span className="text-xs text-gold">{new Date(c.drawScheduledAt).toLocaleString()}</span>
                    )}
                  </span>
                  <Link
                    to={`/draw/${c.id}`}
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hi"
                  >
                    {c.drawState === "completed" ? "View draw" : c.drawState === "live" ? "Join live draw →" : "Open draw room →"}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
