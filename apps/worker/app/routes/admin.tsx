import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { apiGet, apiPost } from "../api-client";
import { Button, Card, ErrorText, Field, Select, useSubmit } from "../admin-ui";

interface OfficeGroup { id: string; name: string; }
interface User { id: string; nickname: string; email: string; role: string; }
interface League { id: string; name: string; status: string; officeGroupId: string; }
interface Sport { id: string; name: string; formatType: string; }
interface Competition { id: string; name: string; formatType: string; status: string; targetEntryCount: number; leagueId: string; }

export async function clientLoader() {
  const [officeGroups, users, leagues, sports, competitions] = await Promise.all([
    apiGet<OfficeGroup[]>("/api/admin/office-groups"),
    apiGet<User[]>("/api/admin/users"),
    apiGet<League[]>("/api/admin/leagues"),
    apiGet<Sport[]>("/api/admin/sports"),
    apiGet<Competition[]>("/api/admin/competitions"),
  ]);
  return { officeGroups, users, leagues, sports, competitions };
}

export default function Admin() {
  const { officeGroups, users, leagues, sports, competitions } = useLoaderData<typeof clientLoader>();
  const admins = users.filter((u) => u.role === "admin" || u.role === "organiser");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="text-muted text-sm">Set up leagues, competitions and run draws.</p>
        </div>
        <Link to="/" className="text-brand text-sm hover:underline">View public site →</Link>
      </header>

      {/* Building blocks — office group + organiser must exist before a league */}
      <div className="grid gap-4 sm:grid-cols-2">
        <OfficeGroupCard officeGroups={officeGroups} />
        <UserCard users={users} officeGroups={officeGroups} />
      </div>

      <LeagueCard leagues={leagues} officeGroups={officeGroups} admins={admins} />
      <CompetitionCard competitions={competitions} leagues={leagues} sports={sports} />
    </div>
  );
}

function OfficeGroupCard({ officeGroups }: { officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [name, setName] = useState("");
  return (
    <Card title="Office groups">
      <ul className="mb-3 space-y-1 text-sm text-slate-300">
        {officeGroups.map((g) => <li key={g.id}>{g.name}</li>)}
        {officeGroups.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => { e.preventDefault(); run(() => apiPost("/api/admin/office-groups", { name }), () => setName("")); }}
      >
        <div className="flex-1"><Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <Button disabled={busy}>Add</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function UserCard({ users, officeGroups }: { users: User[]; officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("organiser");
  return (
    <Card title="People">
      <ul className="mb-3 space-y-1 text-sm text-slate-300 max-h-32 overflow-auto">
        {users.map((u) => <li key={u.id}>{u.nickname} <span className="text-slate-500">({u.role})</span></li>)}
        {users.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => apiPost("/api/admin/users", {
              nickname, email, role,
              officeGroupId: officeGroups[0]?.id,
            }),
            () => { setNickname(""); setEmail(""); },
          );
        }}
      >
        <Field label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="organiser">Organiser</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="participant">Participant</option>
        </Select>
        <Button disabled={busy}>Add person</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function LeagueCard({ leagues, officeGroups, admins }: { leagues: League[]; officeGroups: OfficeGroup[]; admins: User[] }) {
  const { run, error, busy } = useSubmit();
  const [name, setName] = useState("");
  const [officeGroupId, setOfficeGroupId] = useState("");
  const ready = officeGroups.length > 0 && admins.length > 0;
  return (
    <Card title="Leagues">
      <ul className="mb-3 space-y-1 text-sm text-slate-300">
        {leagues.map((l) => <li key={l.id}>{l.name} <span className="text-slate-500">({l.status})</span></li>)}
        {leagues.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      {!ready && <p className="text-sm text-amber-400">Add an office group and at least one organiser/admin first.</p>}
      {ready && (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => apiPost("/api/admin/leagues", {
                name,
                officeGroupId: officeGroupId || officeGroups[0].id,
                createdBy: admins[0].id,
              }),
              () => setName(""),
            );
          }}
        >
          <Field label="League name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select label="Office group" value={officeGroupId} onChange={(e) => setOfficeGroupId(e.target.value)}>
            {officeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <Button disabled={busy}>Create</Button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function CompetitionCard({ competitions, leagues, sports }: { competitions: Competition[]; leagues: League[]; sports: Sport[] }) {
  const { run, error, busy } = useSubmit();
  const [name, setName] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [sportId, setSportId] = useState("");
  const [target, setTarget] = useState("20");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const ready = leagues.length > 0 && sports.length > 0;

  return (
    <Card title="Competitions">
      <ul className="mb-3 space-y-1 text-sm">
        {competitions.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <Link to={`/admin/competitions/${c.id}`} className="text-sky-400 hover:underline">{c.name}</Link>
            <span className="text-slate-500">{c.formatType} · {c.status} · target {c.targetEntryCount}</span>
          </li>
        ))}
        {competitions.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      {!ready && <p className="text-sm text-amber-400">Create a league first.</p>}
      {ready && (
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => apiPost("/api/admin/competitions", {
                name,
                leagueId: leagueId || leagues[0].id,
                sportId: sportId || sports[0].id,
                targetEntryCount: Number(target),
                seasonStart, seasonEnd,
              }),
              () => setName(""),
            );
          }}
        >
          <Field label="Competition name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Target entries (teams/drivers)" type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} required />
          <Select label="League" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Sport" value={sportId} onChange={(e) => setSportId(e.target.value)}>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.formatType})</option>)}
          </Select>
          <Field label="Season start" type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} required />
          <Field label="Season end" type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} required />
          <div className="sm:col-span-2"><Button disabled={busy}>Create competition</Button></div>
        </form>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
