import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import {
  users, participants, competitions, assignments, potEntries, standingsSnapshots,
} from "@spectrum-sweeps/db";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";

interface Participation {
  competitionId: string;
  competitionName: string;
  formatType: string;
  status: string;
  team: string | null;
  crestUrl: string | null;
  // Format-aware position: their team's actual standing.
  positionLabel: string;
  isWin: boolean;
  finished: boolean;
}

interface Badge { icon: string; label: string; }

// Public profile: who someone is + which sweepstakes they're in, their current
// position (which mirrors their team's position), historic placements, and
// badges derived from all of it.
export const profilesApi = new Hono<AppEnv>().get("/:userId", async (c) => {
  const db = getDb(c.env);
  const userId = c.req.param("userId");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).all();
  if (!user) return c.json({ error: "not found" }, 404);

  const parts = await db.select().from(participants).where(eq(participants.userId, userId)).all();

  const participations: Participation[] = [];
  for (const p of parts) {
    const [comp] = await db.select().from(competitions).where(eq(competitions.id, p.competitionId)).all();
    if (!comp) continue;

    // Their drawn team (if the draw has happened).
    const [asn] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.participantId, p.id))
      .all();
    let team: string | null = null;
    let crestUrl: string | null = null;
    if (asn) {
      const [entry] = await db.select().from(potEntries).where(eq(potEntries.id, asn.potEntryId)).all();
      team = entry?.teamOrDriverLabel ?? null;
      crestUrl = entry?.crestUrl ?? null;
    }

    // Their position from the latest standings snapshot (mirrors team position).
    const [snap] = await db
      .select()
      .from(standingsSnapshots)
      .where(eq(standingsSnapshots.competitionId, comp.id))
      .orderBy(desc(standingsSnapshots.computedAt))
      .limit(1)
      .all();
    let positionLabel = comp.drawState === "completed" ? "Awaiting results" : "Not drawn yet";
    let isWin = false;
    const finished = comp.status === "completed";
    if (snap) {
      const rows = (snap.snapshot as { rows: Record<string, unknown>[] }).rows;
      const mine = rows.find((r) => r.participantId === p.id);
      if (mine) {
        if (comp.formatType === "standings") {
          positionLabel = `#${mine.rank} · ${mine.points} pts`;
          isWin = mine.rank === 1;
        } else if (comp.formatType === "season_long") {
          isWin = mine.isChampion === true;
          positionLabel = mine.isChampion ? "Champion" : mine.leaguePosition ? `League position ${mine.leaguePosition}` : "In progress";
        } else {
          positionLabel = `${String(mine.roundReached).replace(/_/g, " ")} · ${mine.points} pts`;
          isWin = mine.roundReached === "winner";
        }
      }
    }

    participations.push({
      competitionId: comp.id,
      competitionName: comp.name,
      formatType: comp.formatType,
      status: comp.status,
      team,
      crestUrl,
      positionLabel,
      isWin,
      finished,
    });
  }

  // Badges derived from participation history.
  const badges: Badge[] = [];
  const wins = participations.filter((p) => p.finished && p.isWin).length;
  const podiums = participations.filter((p) => p.formatType === "standings" && /^#[123] /.test(p.positionLabel)).length;
  if (wins > 0) badges.push({ icon: "🏆", label: `${wins}× winner` });
  if (podiums > 0) badges.push({ icon: "🥉", label: `${podiums}× podium` });
  if (participations.length >= 1) badges.push({ icon: "🎟️", label: `${participations.length} sweepstake${participations.length === 1 ? "" : "s"}` });
  if (participations.some((p) => !p.finished)) badges.push({ icon: "🔴", label: "In play" });
  if (user.accountType === "owner") badges.push({ icon: "👑", label: "Site owner" });
  if (user.accountType === "trader") badges.push({ icon: "🔍", label: "Auditor" });

  return c.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      displayName: user.displayName,
      accountType: user.accountType,
      level: user.level,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    },
    badges,
    active: participations.filter((p) => !p.finished),
    history: participations.filter((p) => p.finished),
  });
});
