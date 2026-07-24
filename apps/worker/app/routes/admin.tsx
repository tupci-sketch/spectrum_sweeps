import { useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api-client";
import { Button, Card, ErrorText, Field, Select, useSubmit } from "../admin-ui";
import { FormatTag, StatusPill } from "../components/ui";
import { useAuth } from "../auth";
import { AuthGate } from "../components/AuthGate";

interface OfficeGroup { id: string; name: string; }
interface User { id: string; nickname: string; fullName?: string | null; role: string; }
interface InviteCode { id: string; code: string; purpose: string; role: string; grantLevel: number; accountType: string; note: string | null; redeemedByUserId: string | null; }
interface CatalogEvent { id: string; name: string; formatType: string; sportLabel: string; season: string; teamCount: number; }
interface Sweepstake { id: string; name: string; formatType: string; status: string; drawState: string; targetEntryCount: number; stake: string | null; prizePool: string | null; groupName: string | null; }
interface Role { id: string; name: string; level: number; permissions: Record<string, boolean>; isSystem: boolean; }

export async function clientLoader() {
  const [officeGroups, users, catalog, sweepstakes] = await Promise.all([
    apiGet<OfficeGroup[]>("/api/admin/office-groups"),
    apiGet<User[]>("/api/admin/users"),
    apiGet<CatalogEvent[]>("/api/catalog"),
    apiGet<Sweepstake[]>("/api/admin/sweepstakes"),
  ]);
  const invites = await apiGet<InviteCode[]>("/api/admin/invites").catch(() => [] as InviteCode[]);
  const roles = await apiGet<Role[]>("/api/admin/roles").catch(() => [] as Role[]);
  return { officeGroups, users, catalog, sweepstakes, invites, roles };
}

const CAPS = ["organise", "runDraw", "generateCodes", "viewAudit", "moderate", "createPolls", "createMiniGames", "manageRoles"] as const;
const FORMAT_LABEL: Record<string, string> = { knockout: "Knockout", season_long: "Season-long", standings: "Standings (points)" };

export default function Admin() {
  return (
    <AuthGate minLevel={5}>
      <AdminInner />
    </AuthGate>
  );
}

function AdminInner() {
  const { officeGroups, users, catalog, sweepstakes, invites, roles } = useLoaderData<typeof clientLoader>();
  const { user, logout } = useAuth();
  const isOwner = (user?.level ?? 0) >= 7;

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

      {/* The main event: create + manage sweepstakes */}
      <CreateSweepstakeCard catalog={catalog} officeGroups={officeGroups} />
      <SweepstakesListCard sweepstakes={sweepstakes} />

      {/* Housekeeping */}
      <details className="rounded-xl border border-border bg-surface/40" open>
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted">
          People &amp; access
        </summary>
        <div className="space-y-6 p-5 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <UserCard users={users} officeGroups={officeGroups} />
            <OfficeGroupCard officeGroups={officeGroups} />
          </div>
          <InviteCodesCard invites={invites} isOwner={isOwner} officeGroups={officeGroups} />
          {isOwner && <RolesCard roles={roles} users={users} />}
        </div>
      </details>
    </div>
  );
}

// ---- Create a sweepstake — one guided form, interconnected dropdowns ----

function CreateSweepstakeCard({ catalog, officeGroups }: { catalog: CatalogEvent[]; officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [source, setSource] = useState(catalog[0]?.id ?? "custom"); // catalog id or "custom"
  const [name, setName] = useState("");
  const [officeGroupId, setOfficeGroupId] = useState(officeGroups[0]?.id ?? "");
  const [format, setFormat] = useState("season_long");
  const [target, setTarget] = useState("20");
  const [stake, setStake] = useState("");
  const [prizePool, setPrizePool] = useState("");

  const chosen = useMemo(() => catalog.find((c) => c.id === source), [catalog, source]);
  const isCustom = source === "custom";
  // Suggested name follows the chosen event until the user types their own.
  const effectiveName = name || (chosen ? chosen.name : "");
  const effectiveFormat = isCustom ? format : (chosen?.formatType ?? "season_long");
  const effectiveTarget = isCustom ? Number(target) : (chosen?.teamCount ?? 0);
  const groupName = officeGroups.find((g) => g.id === officeGroupId)?.name ?? "—";
  const ready = officeGroups.length > 0 && effectiveName.length >= 2 && effectiveTarget > 0;

  function submit() {
    const payload: Record<string, unknown> = {
      name: effectiveName,
      officeGroupId,
      stake: stake || undefined,
      prizePool: prizePool || undefined,
    };
    if (isCustom) {
      payload.formatType = format;
      payload.targetEntryCount = Number(target);
    } else {
      payload.catalogLeagueId = source;
    }
    run(() => apiPost("/api/admin/sweepstakes", payload), () => { setName(""); setStake(""); setPrizePool(""); });
  }

  return (
    <Card title="Create a sweepstake">
      {officeGroups.length === 0 ? (
        <p className="text-sm text-amber-400">Add a group below first (People &amp; access).</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {/* 1. What are you running? */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">1 · What are you running?</p>
              <Select label="Event" value={source} onChange={(e) => setSource(e.target.value)}>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.teamCount} {c.formatType === "standings" ? "drivers" : "teams"}, {FORMAT_LABEL[c.formatType] ?? c.formatType}
                  </option>
                ))}
                <option value="custom">Custom event (add teams/drivers yourself)</option>
              </Select>
              {!isCustom && chosen && (
                <p className="mt-1 text-xs text-emerald-400">
                  ✓ {chosen.teamCount} {chosen.formatType === "standings" ? "drivers" : "teams"} added automatically from {chosen.season}.
                </p>
              )}
              {isCustom && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="season_long">Season-long (whoever's team tops the table wins)</option>
                    <option value="knockout">Knockout (last team standing wins)</option>
                    <option value="standings">Standings (cumulative points, e.g. F1)</option>
                  </Select>
                  <Field label="How many entries?" type="number" min={2} max={200} value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
              )}
            </div>

            {/* 2. Name + who it's for */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">2 · Name &amp; group</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Sweepstake name" value={effectiveName} onChange={(e) => setName(e.target.value)} required placeholder="e.g. PL 26/27" />
                <Select label="Who's it for?" value={officeGroupId} onChange={(e) => setOfficeGroupId(e.target.value)}>
                  {officeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </div>
            </div>

            {/* 3. Stake + prize */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">3 · Stake &amp; prize (optional)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Entry / stake" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="e.g. £5" />
                <Field label="Prize pool" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="e.g. Winner takes 80%" />
              </div>
            </div>

            <Button disabled={busy || !ready}>{busy ? "Creating…" : "Create sweepstake"}</Button>
            <ErrorText>{error}</ErrorText>
          </form>

          {/* Live preview */}
          <aside className="rounded-xl border border-border bg-surface-2/40 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
            <p className="mt-2 text-lg font-bold text-ink">{effectiveName || "Untitled sweepstake"}</p>
            <dl className="mt-3 space-y-1.5 text-muted">
              <PreviewRow k="Format" v={FORMAT_LABEL[effectiveFormat] ?? effectiveFormat} />
              <PreviewRow k="Entries" v={effectiveTarget > 0 ? `${effectiveTarget} slots` : "—"} />
              <PreviewRow k="Group" v={groupName} />
              <PreviewRow k="Stake" v={stake || "—"} />
              <PreviewRow k="Prize" v={prizePool || "—"} />
              <PreviewRow k="Teams" v={isCustom ? "Added manually" : `${chosen?.teamCount ?? 0} auto-added`} />
            </dl>
          </aside>
        </div>
      )}
    </Card>
  );
}

function PreviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}

function SweepstakesListCard({ sweepstakes }: { sweepstakes: Sweepstake[] }) {
  const { run, busy } = useSubmit();
  return (
    <Card title={`Your sweepstakes (${sweepstakes.length})`}>
      {sweepstakes.length === 0 ? (
        <p className="text-sm text-muted">None yet — create one above.</p>
      ) : (
        <ul className="space-y-2">
          {sweepstakes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/30 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/competitions/${s.id}`} className="font-semibold text-ink hover:text-brand">{s.name}</Link>
                  <FormatTag formatType={s.formatType} />
                  <StatusPill status={s.drawState === "live" ? "live" : s.status} />
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {s.groupName ?? "—"} · {s.targetEntryCount} slots
                  {s.stake ? ` · stake ${s.stake}` : ""}
                  {s.prizePool ? ` · ${s.prizePool}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link to={`/admin/competitions/${s.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hi">
                  Manage →
                </Link>
                <button
                  onClick={() => { if (confirm(`Delete sweepstake "${s.name}"? This can't be undone.`)) run(() => apiDelete(`/api/admin/sweepstakes/${s.id}`)); }}
                  disabled={busy}
                  className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---- People & access (unchanged behaviour) ----

function OfficeGroupCard({ officeGroups }: { officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [name, setName] = useState("");
  return (
    <Card title="Groups">
      <ul className="mb-3 space-y-1 text-sm text-slate-300">
        {officeGroups.map((g) => <li key={g.id}>{g.name}</li>)}
        {officeGroups.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => { e.preventDefault(); run(() => apiPost("/api/admin/office-groups", { name }), () => setName("")); }}
      >
        <div className="flex-1"><Field label="New group" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Marketing" /></div>
        <Button disabled={busy}>Add</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function UserCard({ users, officeGroups }: { users: User[]; officeGroups: OfficeGroup[] }) {
  const { run, error, busy } = useSubmit();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("participant");
  return (
    <Card title="People">
      <ul className="mb-3 space-y-1 text-sm text-slate-300 max-h-32 overflow-auto">
        {users.map((u) => (
          <li key={u.id}>
            {u.nickname}
            {u.fullName && u.fullName !== u.nickname && <span className="text-slate-500"> · {u.fullName}</span>}
            <span className="text-slate-500"> ({u.role})</span>
          </li>
        ))}
        {users.length === 0 && <li className="text-slate-500">None yet.</li>}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => apiPost("/api/admin/users", { fullName, role, officeGroupId: officeGroups[0]?.id }),
            () => setFullName(""),
          );
        }}
      >
        <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} placeholder="e.g. Priya Shah" />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="participant">Participant</option>
          <option value="organiser">Organiser</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </Select>
        <Button disabled={busy}>Add person</Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function RolesCard({ roles, users }: { roles: Role[]; users: User[] }) {
  const { run, error, busy } = useSubmit();
  const [assignUser, setAssignUser] = useState("");
  const [assignRole, setAssignRole] = useState("");

  return (
    <Card title="Roles & permissions">
      <p className="mb-3 text-sm text-muted">Edit what each account type can do. Toggles take effect immediately.</p>
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-surface-2/30 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{r.name} {r.isSystem && <span className="text-[10px] text-faint">system</span>}</span>
              <label className="flex items-center gap-1 text-xs text-muted">
                Level
                <input
                  type="number" min={1} max={7} defaultValue={r.level}
                  onBlur={(e) => run(() => apiPatch(`/api/admin/roles/${r.id}`, { level: Number(e.target.value) }))}
                  className="w-14 rounded border border-border bg-surface px-1 py-0.5 text-ink"
                />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {CAPS.map((cap) => (
                <label key={cap} className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    defaultChecked={r.permissions[cap] === true}
                    onChange={(e) => run(() => apiPatch(`/api/admin/roles/${r.id}`, { permissions: { ...r.permissions, [cap]: e.target.checked } }))}
                  />
                  {cap}
                </label>
              ))}
            </div>
          </div>
        ))}
        {roles.length === 0 && <p className="text-sm text-muted">No roles loaded.</p>}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Assign a role to someone</p>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const role = roles.find((x) => x.name === assignRole);
            if (!role) return;
            run(() => apiPatch(`/api/admin/roles/users/${assignUser}`, { accountType: role.name, level: role.level }));
          }}
        >
          <Select label="Person" value={assignUser} onChange={(e) => setAssignUser(e.target.value)}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.nickname}</option>)}
          </Select>
          <Select label="Role" value={assignRole} onChange={(e) => setAssignRole(e.target.value)}>
            <option value="">—</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name} (L{r.level})</option>)}
          </Select>
          <Button disabled={busy || !assignUser || !assignRole}>Assign</Button>
        </form>
      </div>
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
        <span className="text-gold">organiser grants</span> that let an organiser run their own sweepstakes.
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
                <button className="font-mono text-gold hover:underline" onClick={() => navigator.clipboard?.writeText(i.code)} title="Copy">
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
