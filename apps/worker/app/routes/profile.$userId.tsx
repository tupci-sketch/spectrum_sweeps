import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { API_BASE } from "../api-client";
import { Panel } from "../components/ui";

interface Participation {
  competitionId: string; competitionName: string; formatType: string; status: string;
  team: string | null; crestUrl: string | null; positionLabel: string; isWin: boolean; finished: boolean;
}
interface ProfileResp {
  user: { id: string; nickname: string; displayName: string; accountType: string; level: number; bio: string | null; avatarUrl: string | null };
  badges: { icon: string; label: string }[];
  active: Participation[];
  history: Participation[];
}

function Row({ p }: { p: Participation }) {
  return (
    <li className="flex items-center justify-between border-b border-border py-2.5">
      <div className="flex items-center gap-3">
        {p.crestUrl && <img src={p.crestUrl} alt="" width={22} height={22} className="object-contain" />}
        <div>
          <Link to={`/leaderboard/${p.competitionId}`} className="font-medium hover:underline">{p.competitionName}</Link>
          <p className="text-xs text-muted">{p.team ?? "—"}</p>
        </div>
      </div>
      <span className={`text-sm ${p.isWin ? "text-gold font-semibold" : "text-muted"}`}>{p.isWin ? "🏆 " : ""}{p.positionLabel}</span>
    </li>
  );
}

export default function Profile() {
  const userId = useParams().userId!;
  const [data, setData] = useState<ProfileResp | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/profiles/${userId}`)
      .then((r) => (r.ok ? (r.json() as Promise<ProfileResp>) : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setNotFound(true));
  }, [userId]);

  if (notFound) return <div className="mx-auto max-w-2xl px-5 py-16 text-center text-muted">Profile not found.</div>;
  if (!data) return <div className="mx-auto max-w-2xl px-5 py-8 text-muted">Loading profile…</div>;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
      <header className="mb-6 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand/20 text-2xl font-bold text-brand">
          {data.user.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{data.user.nickname}</h1>
          <p className="text-sm text-muted">{data.user.accountType} · level {data.user.level}</p>
        </div>
      </header>

      {data.user.bio && <p className="mb-6 text-slate-300">{data.user.bio}</p>}

      {data.badges.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {data.badges.map((b, i) => (
            <span key={i} className="rounded-full border border-border bg-surface-2/50 px-3 py-1 text-sm">
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      <Panel title="Current sweepstakes">
        <ul>
          {data.active.map((p) => <Row key={p.competitionId} p={p} />)}
          {data.active.length === 0 && <li className="py-2 text-muted">Not in any active sweepstakes.</li>}
        </ul>
      </Panel>

      <Panel title="Historic placements" className="mt-6">
        <ul>
          {data.history.map((p) => <Row key={p.competitionId} p={p} />)}
          {data.history.length === 0 && <li className="py-2 text-muted">No finished sweepstakes yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
