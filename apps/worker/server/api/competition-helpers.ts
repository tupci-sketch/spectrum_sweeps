import { and, eq, count } from "drizzle-orm";
import type { Db } from "@spectrum-sweeps/db";
import { participants } from "@spectrum-sweeps/db";

// Number of active (non-withdrawn) participants in a competition — the value
// the capacity gate and the draw-fullness check both compare against
// competitions.target_entry_count.
export async function countActiveParticipants(db: Db, competitionId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(participants)
    .where(and(eq(participants.competitionId, competitionId), eq(participants.entryStatus, "active")))
    .all();
  return row?.value ?? 0;
}
