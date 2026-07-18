import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { apiGet, apiPost } from "../api-client";
import { Button, Card, ErrorText, Field, Select, useSubmit } from "../admin-ui";
import { useAuth } from "../auth";
import { AuthGate } from "../components/AuthGate";

interface OfficeGroup { id: string; name: string; }
interface User { id: string; nickname: string; email: string; role: string; }
interface League { id: string; name: string; status: string; officeGroupId: string; }
interface Sport { id: string; name: string; formatType: string; }
interface Competition { id: string; name: string; formatType: string; status: string; targetEntryCount: number; leagueId: string; }
interface InviteCode { id: string; code: string; purpose: string; role: string; grantLevel: number; accountType: string; note: string | null; redeemedByUserId: string | null; }

export async function clientLoader() {
  const [officeGroups, users, leagues, sports, competitions] = await Promise.all([
    apiGet<OfficeGroup[]>("/api/admin/office-groups"),
    apiGet<User[]>("/api/admin/users"),
    apiGet<League[]>("/api/admin/leagues"),
    apiGet<Sport[]>("/api/admin/sports"),
    apiGet<Competition[]>("/api/admin/competitions"),
  ]);
  // Invite codes are L5-gated; when logged out this 401s — swallow it so the
  // loader stays usable and the AuthGate handles the sign-in prompt.
  const invites = await apiGet<InviteCode[]>("/api/admin/invites").catch(() => [] as InviteCode[]);
  return { officeGroups, users, leagues, sports, competitions, invites };
}

export default function Admin() {
  return (
    <AuthGate minLevel={5}>
      <AdminInner />
    </AuthGate>
  );
}

function AdminInner() {
  const { officeGroups, users, leagues, sports, competitions, invites } = useLoaderData<typeof clientLoader>();
  const { user, logout } = useAuth();
  const admins = users.filter((u) => u.role === "admin" || u.role === "organiser");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="text-muted text-sm">
            Signed in as {user?.nickname} · level {user?.level} ·{" "}
            <button onClick={() => logout()} className="text-brand hover:underline">log out</button>
          </p>
        </div>
        <Link to="/" className="text-brand text-sm hover:underline">View public site →</Link>
      </header>

      <InviteCodesCard invites={invites} isOwner={(user?.level ?? 0) >= 7} officeGroups={officeGroups} />

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

function InviteCodesCard({
  invites, isOwner, officeGroups,
}: { invites: InviteCode[]; isOwner: boolean; officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [purpose, setPurpose] = useState("signup");
  const [accountType, setAccountType] = useState("participant");
  const [grantLevel, setGrantLevel] = useState("1");
  const [note, setNote] = useState("");
  const available = invites.filter((i) => !i.redeemedByUserId);
  const used = invites.filter((i) => i.redeemedByUserId);

  return (
    <Card title="Invite codes">
      <p className="mb-3 text-sm text-muted">
        Generate a one-time code so someone can register. Owners can also issue{" "}
        <span className="text-gold">organiser grants</span> that let an organiser run their own league.
      </p>

      <form
        className="grid gap-2 sm:grid-cols-2 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            apiPost("/api/admin/invites", {
              purpose,
              accountType: purpose === "signup" ? accountType : undefined,
              role: purpose === "signup" ? (accountType === "organiser" ? "organiser" : "participant") : undefined,
              grantLevel: purpose === "signup" ? Number(grantLevel) : undefined,
              officeGroupId: officeGroups[0]?.id,
              note: note || undefined,
            }),
          );
        }}
      >
        <Select label="Code type" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="signup">Signup</option>
          {isOwner && <option value="organiser_grant">Organiser grant (owner only)</option>}
        </Select>
        {purpose === "signup" && (
          <>
            <Select label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              <option value="participant">Participant</option>
              <option value="organiser">Organiser</option>
              <option value="trader">Trader (can inspect audits)</option>
              <option value="moderator">Moderator</option>
            </Select>
            <Field label="Level (1–7)" type="number" min={1} max={7} value={grantLevel} onChange={(e) => setGrantLevel(e.target.value)} />
          </>
        )}
        <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. for Priya in Trading" />
        <div className="sm:col-span-2"><Button disabled={busy}>Generate code</Button></div>
      </form>
      <ErrorText>{error}</ErrorText>

      {available.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Available</p>
          <ul className="mt-1 space-y-1 text-sm">
            {available.map((i) => (
              <li key={i.id} className="flex items-center justify-between border-b border-border py-1">
                <button
                  className="font-mono text-gold hover:underline"
                  onClick={() => navigator.clipboard?.writeText(i.code)}
                  title="Copy"
                >
                  {i.code}
                </button>
                <span className="text-xs text-muted">
                  {i.purpose.replace(/_/g, " ")}
                  {i.purpose === "signup" ? ` · ${i.accountType} · L${i.grantLevel}` : ""}
                  {i.note ? ` · ${i.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {used.length > 0 && (
        <p className="mt-3 text-xs text-faint">{used.length} code{used.length === 1 ? "" : "s"} already redeemed.</p>
      )}
    </Card>
  );
}
