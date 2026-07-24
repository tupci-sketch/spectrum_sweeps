import { eq } from "drizzle-orm";
import { users } from "@spectrum-sweeps/db";
import type { getDb } from "./db";

// Display rule: go by first name; add a last initial only when more than one
// account shares that first name (case-insensitive). "Corey Topping" → "Corey"
// until another Corey exists, then both become "Corey T", "Corey <X>".

export function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full.trim();
}

function lastInitialOf(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : "";
}

export function displayFrom(full: string, sharesFirstName: boolean): string {
  const first = firstNameOf(full);
  const li = lastInitialOf(full);
  return sharesFirstName && li ? `${first} ${li}` : first;
}

// Recompute nickname/displayName for every account that has a full name, so a
// newly-added duplicate first name retroactively adds last initials to all who
// share it. Small office scale — a full sweep on each change is fine.
export async function recomputeDisplayNames(db: ReturnType<typeof getDb>) {
  const all = await db.select().from(users).all();
  const firstCounts = new Map<string, number>();
  for (const u of all) {
    if (!u.fullName) continue;
    const key = firstNameOf(u.fullName).toLowerCase();
    firstCounts.set(key, (firstCounts.get(key) ?? 0) + 1);
  }
  for (const u of all) {
    if (!u.fullName) continue;
    const shares = (firstCounts.get(firstNameOf(u.fullName).toLowerCase()) ?? 0) > 1;
    const display = displayFrom(u.fullName, shares);
    if (display !== u.nickname || display !== u.displayName) {
      await db.update(users).set({ nickname: display, displayName: display }).where(eq(users.id, u.id)).run();
    }
  }
}
