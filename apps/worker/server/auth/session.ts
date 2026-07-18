import { eq, and, gt } from "drizzle-orm";
import type { Db } from "@spectrum-sweeps/db";
import { sessions, users } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

// Returns the raw bearer token to hand to the client. Only its SHA-256 is
// stored, so a DB leak never yields usable tokens.
export async function createSession(db: Db, userId: string): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const id = await sha256Hex(token);
  await db
    .insert(sessions)
    .values({ id, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .run();
  return token;
}

export async function resolveSession(db: Db, token: string) {
  const id = await sha256Hex(token);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .all();
  if (!row) return null;
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).all();
  return user ?? null;
}

export async function destroySession(db: Db, token: string): Promise<void> {
  const id = await sha256Hex(token);
  await db.delete(sessions).where(eq(sessions.id, id)).run();
}

export { newId };
