import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/admin.competitions.$competitionId";
import { apiGet, apiPatch, apiPost } from "../api-client";
import { Button, Card, ErrorText, Field, Select, useSubmit } from "../admin-ui";

interface Competition { id: string; name: string; formatType: string; status: string; targetEntryCount: number; joinCode: string; drawState: string; drawScheduledAt: number | null; }
interface Participant { id: string; userId: string; paid: boolean; entryStatus: string; }
interface User { id: string; nickname: string; email: string; role: string; }
interface Entry { id: string; teamOrDriverLabel: string; isDrawn: boolean; drawPotId: string; }
interface Pot { id: string; name: string; }
interface Assignment { id: string; participantId: string; potEntryId: string; }

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = params.competitionId;
  const [competition, participants, users, entries, pots, assignments] = await Promise.all([
    apiGet<Competition>(`/api/admin/competitions/${id}`),
    apiGet<Participant[]>(`/api/admin/participants?competitionId=${id}`),
    apiGet<User[]>("/api/admin/users"),
    apiGet<Entry[]>(`/api/admin/draw/entries?competitionId=${id}`),
    apiGet<Pot[]>(`/api/admin/draw/pots?competitionId=${id}`),
    apiGet<Assignment[]>(`/api/admin/draw/assignments?competitionId=${id}`),
  ]);
  return { competition, participants, users, entries, pots, assignments };
}

export default function CompetitionDetail() {
  const { competition, participants, users, entries, pots, assignments } = useLoaderData<typeof clientLoader>();
  const userById = new Map(users.map((u) => [u.id, u]));
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const actor = users.find((u) => u.role === "admin" || u.role === "organiser") ?? users[0];
  const activeParticipants = participants.filter((p) => p.entryStatus === "active");
  const full = activeParticipants.length === competition.targetEntryCount;
  const drawn = assignments.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{competition.name}</h1>
          <p className="text-sm text-slate-400">
            {competition.formatType} · status <span className="text-slate-200">{competition.status}</span> ·
            join code <span className="font-mono text-slate-200">{competition.joinCode}</span>
          </p>
        </div>
        <div className="text-right text-sm">
          <Link to="/admin" className="text-sky-400 hover:underline">← Admin</Link>
          <br />
          <Link to={`/leaderboard/${competition.id}`} className="text-sky-400 hover:underline">Leaderboard →</Link>
        </div>
      </header>

      {!actor && (
        <p className="rounded bg-amber-500/10 p-3 text-sm text-amber-400">
          Add an organiser/admin person on the Admin page before entering participants or running the draw.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ParticipantsCard
          competition={competition}
          participants={activeParticipants}
          userById={userById}
          actor={actor}
          drawn={drawn}
        />
        <TeamsCard competitionId={competition.id} entries={entries} pots={pots} drawn={drawn} />
      </div>

      <DrawCard
        competition={competition}
        actor={actor}
        full={full}
        participantCount={activeParticipants.length}
        availableEntries={entries.filter((e) => !e.isDrawn).length}
        drawn={drawn}
      />

      {drawn && (
        <Card title="Draw results">
          <ul className="space-y-1 text-sm">
            {assignments.map((a) => {
              const p = participants.find((x) => x.id === a.participantId);
              const nick = p ? userById.get(p.userId)?.nickname ?? p.userId : a.participantId;
              return (
                <li key={a.id} className="flex justify-between border-b border-slate-800 py-1">
                  <span>{nick}</span>
                  <span className="text-slate-300">{entryById.get(a.potEntryId)?.teamOrDriverLabel ?? a.potEntryId}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {drawn && actor && (
        <ResultsCard competition={competition} entries={entries} actor={actor} />
      )}
    </div>
  );
}

function ParticipantsCard({
  competition, participants, userById, actor, drawn,
}: {
  competition: Competition;
  participants: Participant[];
  userById: Map<string, User>;
  actor: User | undefined;
  drawn: boolean;
}) {
  const { run, error, busy } = useSubmit();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const remaining = competition.targetEntryCount - participants.length;

  return (
    <Card title={`Participants (${participants.length}/${competition.targetEntryCount})`}>
      <ul className="mb-3 max-h-48 space-y-1 overflow-auto text-sm">
        {participants.map((p) => {
          const u = userById.get(p.userId);
          return (
            <li key={p.id} className="flex items-center justify-between border-b border-slate-800 py-1">
              <span>{u?.nickname ?? p.userId}</span>
              <PaidToggle participantId={p.id} paid={p.paid} />
            </li>
          );
        })}
        {participants.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>

      {drawn ? (
        <p className="text-sm text-slate-500">Draw complete — entries are locked.</p>
      ) : remaining <= 0 ? (
        <p className="text-sm text-emerald-400">Full — ready to draw.</p>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const user = await apiPost<User>("/api/admin/users", { nickname, email, role: "participant" });
              await apiPost("/api/admin/participants", { competitionId: competition.id, userId: user.id });
            }, () => { setNickname(""); setEmail(""); });
          }}
        >
          <p className="text-xs text-slate-500">{remaining} place{remaining === 1 ? "" : "s"} left</p>
          <Field label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required disabled={!actor} />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!actor} />
          <Button disabled={busy || !actor}>Add participant</Button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function PaidToggle({ participantId, paid }: { participantId: string; paid: boolean }) {
  const { run, busy } = useSubmit();
  return (
    <button
      disabled={busy}
      onClick={() => run(() => apiPatch(`/api/admin/participants/${participantId}/paid`, { paid: !paid }))}
      className={`rounded px-2 py-0.5 text-xs ${paid ? "bg-emerald-600/30 text-emerald-300" : "bg-slate-700 text-slate-300"}`}
    >
      {paid ? "paid" : "unpaid"}
    </button>
  );
}

function TeamsCard({
  competitionId, entries, pots, drawn,
}: { competitionId: string; entries: Entry[]; pots: Pot[]; drawn: boolean }) {
  const { run, error, busy } = useSubmit();
  const [label, setLabel] = useState("");

  return (
    <Card title={`Teams / drivers (${entries.length})`}>
      <ul className="mb-3 max-h-48 space-y-1 overflow-auto text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex justify-between border-b border-slate-800 py-1">
            <span>{e.teamOrDriverLabel}</span>
            {e.isDrawn && <span className="text-xs text-slate-500">drawn</span>}
          </li>
        ))}
        {entries.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      {drawn ? (
        <p className="text-sm text-slate-500">Draw complete — pool is locked.</p>
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              // Auto-create a single default pot the first time a team is added.
              let potId = pots[0]?.id;
              if (!potId) {
                const pot = await apiPost<Pot>("/api/admin/draw/pots", { competitionId, name: "Main pool" });
                potId = pot.id;
              }
              await apiPost("/api/admin/draw/entries", { drawPotId: potId, teamOrDriverLabel: label });
            }, () => setLabel(""));
          }}
        >
          <div className="flex-1"><Field label="Team / driver" value={label} onChange={(e) => setLabel(e.target.value)} required /></div>
          <Button disabled={busy}>Add</Button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function DrawCard({
  competition, actor, full, participantCount, availableEntries, drawn,
}: {
  competition: Competition;
  actor: User | undefined;
  full: boolean;
  participantCount: number;
  availableEntries: number;
  drawn: boolean;
}) {
  const { run, error, busy } = useSubmit();
  const [when, setWhen] = useState("");
  const enoughEntries = availableEntries >= participantCount && participantCount > 0;
  const ready = full && enoughEntries && !!actor;
  const ds = competition.drawState;

  return (
    <Card title="The draw">
      {drawn || ds === "completed" ? (
        <p className="text-sm text-emerald-400">
          Draw completed. <Link to={`/draw/${competition.id}`} className="text-brand hover:underline">Open draw room →</Link>
        </p>
      ) : ds === "scheduled" || ds === "live" ? (
        <div className="text-sm">
          <p className="text-muted">
            {ds === "live" ? "Draw is live now." : "Scheduled for "}
            {ds === "scheduled" && competition.drawScheduledAt && (
              <span className="text-gold">{new Date(competition.drawScheduledAt).toLocaleString()}</span>
            )}
          </p>
          <Link to={`/draw/${competition.id}`} className="mt-2 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-hi">
            Open draw room →
          </Link>
          <p className="mt-2 text-xs text-muted">Everyone entered opens this room; an owner (L7) runs the spin live.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            Schedule the draw for a date/time. Entrants gather in the draw room and an owner reveals each pick live.
          </p>
          <ul className="mt-2 text-sm">
            <li className={full ? "text-emerald-400" : "text-muted"}>
              {full ? "✓" : "•"} Participants: {participantCount}/{competition.targetEntryCount}
            </li>
            <li className={enoughEntries ? "text-emerald-400" : "text-muted"}>
              {enoughEntries ? "✓" : "•"} Teams/drivers available: {availableEntries} (need ≥ {participantCount})
            </li>
          </ul>
          {ready && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => { e.preventDefault(); run(() => apiPost(`/api/draw/competitions/${competition.id}/schedule`, { scheduledAt: when })); }}
            >
              <label className="text-sm">
                <span className="text-muted">Draw date &amp; time</span>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  required
                  className="mt-1 block rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <Button disabled={busy}>Schedule draw</Button>
            </form>
          )}
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const KNOCKOUT_ROUNDS = ["group_stage", "round_of_16", "quarter_final", "semi_final", "final", "winner"];

function ResultsCard({ competition, entries, actor }: { competition: Competition; entries: Entry[]; actor: User }) {
  const { run, error, busy } = useSubmit();
  const [subjectRef, setSubjectRef] = useState(entries[0]?.id ?? "");
  const [round, setRound] = useState("winner");
  const [leaguePosition, setLeaguePosition] = useState("1");
  const [isChampion, setIsChampion] = useState(false);
  const [finishingPosition, setFinishingPosition] = useState("1");
  const [fastestLap, setFastestLap] = useState(false);

  function submit() {
    let eventType: string;
    let payload: Record<string, unknown>;
    if (competition.formatType === "knockout") {
      eventType = "round_elimination";
      payload = { roundReached: round };
    } else if (competition.formatType === "season_long") {
      eventType = "points_award";
      payload = { leaguePosition: Number(leaguePosition), isChampion };
    } else {
      eventType = "race_result";
      payload = { finishingPosition: Number(finishingPosition), bonuses: fastestLap ? ["fastestLap"] : [] };
    }
    run(() => apiPost("/api/admin/results", {
      competitionId: competition.id,
      subjectRef,
      eventType,
      payload,
      recordedBy: actor.id,
    }));
  }

  return (
    <Card title="Enter a result">
      <p className="mb-3 text-sm text-slate-400">
        Records a result against a team/driver; the leaderboard recomputes automatically.
      </p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Select label="Team / driver" value={subjectRef} onChange={(e) => setSubjectRef(e.target.value)}>
          {entries.map((en) => <option key={en.id} value={en.id}>{en.teamOrDriverLabel}</option>)}
        </Select>

        {competition.formatType === "knockout" && (
          <Select label="Round reached" value={round} onChange={(e) => setRound(e.target.value)}>
            {KNOCKOUT_ROUNDS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
          </Select>
        )}

        {competition.formatType === "season_long" && (
          <>
            <Field label="Final league position" type="number" min={1} value={leaguePosition} onChange={(e) => setLeaguePosition(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input type="checkbox" checked={isChampion} onChange={(e) => setIsChampion(e.target.checked)} />
              Champion (wins the sweepstake)
            </label>
          </>
        )}

        {competition.formatType === "standings" && (
          <>
            <Field label="Finishing position" type="number" min={1} value={finishingPosition} onChange={(e) => setFinishingPosition(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input type="checkbox" checked={fastestLap} onChange={(e) => setFastestLap(e.target.checked)} />
              Fastest lap bonus
            </label>
          </>
        )}

        <div className="sm:col-span-2"><Button disabled={busy || !subjectRef}>Record result</Button></div>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
