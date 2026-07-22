import { eq, inArray } from "drizzle-orm";
import {
  competitions,
  leagues,
  drawPots,
  potEntries,
  assignments,
  drawAuditLog,
  standingsSnapshots,
  scoreEvents,
  participants,
  chatMessages,
  inviteCodes,
  engagementSyncLog,
  polls,
  pollVotes,
  forumThreads,
  forumPosts,
  miniGames,
  miniGameEntries,
  prizeConfigs,
} from "@spectrum-sweeps/db";
import type { getDb } from "./db";

type Db = ReturnType<typeof getDb>;

// Remove a competition and everything that hangs off it. D1 has no cross-
// statement transaction, but at office scale a best-effort ordered delete is
// fine — children first so no foreign key is ever left dangling.
export async function deleteCompetitionCascade(db: Db, competitionId: string) {
  // Order matters: assignments reference pot_entries and draw_pots, so they go
  // first; then entries (which reference pots); then the pots themselves.
  await db.delete(assignments).where(eq(assignments.competitionId, competitionId)).run();
  const pots = await db.select().from(drawPots).where(eq(drawPots.competitionId, competitionId)).all();
  if (pots.length > 0) {
    await db.delete(potEntries).where(inArray(potEntries.drawPotId, pots.map((p) => p.id))).run();
  }
  await db.delete(drawPots).where(eq(drawPots.competitionId, competitionId)).run();
  await db.delete(drawAuditLog).where(eq(drawAuditLog.competitionId, competitionId)).run();
  await db.delete(standingsSnapshots).where(eq(standingsSnapshots.competitionId, competitionId)).run();
  await db.delete(scoreEvents).where(eq(scoreEvents.competitionId, competitionId)).run();
  await db.delete(participants).where(eq(participants.competitionId, competitionId)).run();
  await db.delete(chatMessages).where(eq(chatMessages.competitionId, competitionId)).run();
  await db.delete(inviteCodes).where(eq(inviteCodes.competitionId, competitionId)).run();
  await db.delete(engagementSyncLog).where(eq(engagementSyncLog.competitionId, competitionId)).run();
  await db.delete(competitions).where(eq(competitions.id, competitionId)).run();
}

// Remove a league: every competition under it (cascaded), then league-scoped
// social/prize records, then the league itself.
export async function deleteLeagueCascade(db: Db, leagueId: string) {
  const comps = await db.select().from(competitions).where(eq(competitions.leagueId, leagueId)).all();
  for (const comp of comps) {
    await deleteCompetitionCascade(db, comp.id);
  }

  const leaguePolls = await db.select().from(polls).where(eq(polls.leagueId, leagueId)).all();
  if (leaguePolls.length > 0) {
    await db.delete(pollVotes).where(inArray(pollVotes.pollId, leaguePolls.map((p) => p.id))).run();
    await db.delete(polls).where(eq(polls.leagueId, leagueId)).run();
  }

  const threads = await db.select().from(forumThreads).where(eq(forumThreads.leagueId, leagueId)).all();
  if (threads.length > 0) {
    await db.delete(forumPosts).where(inArray(forumPosts.threadId, threads.map((t) => t.id))).run();
    await db.delete(forumThreads).where(eq(forumThreads.leagueId, leagueId)).run();
  }

  const games = await db.select().from(miniGames).where(eq(miniGames.leagueId, leagueId)).all();
  if (games.length > 0) {
    await db.delete(miniGameEntries).where(inArray(miniGameEntries.miniGameId, games.map((g) => g.id))).run();
    await db.delete(miniGames).where(eq(miniGames.leagueId, leagueId)).run();
  }

  await db.delete(chatMessages).where(eq(chatMessages.leagueId, leagueId)).run();
  await db.delete(engagementSyncLog).where(eq(engagementSyncLog.leagueId, leagueId)).run();
  await db.delete(prizeConfigs).where(eq(prizeConfigs.leagueId, leagueId)).run();
  await db.delete(leagues).where(eq(leagues.id, leagueId)).run();
}
