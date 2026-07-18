// Pure, testable draw primitives — no DB or Worker runtime dependency.
// Randomness uses crypto.getRandomValues (never Math.random), and the draw is
// pre-committed via a hash before any reveal, per the legal/audit design in the
// plan doc: the outcome is fixed and provable before it's shown.

// Fisher–Yates shuffle driven by a caller-supplied seed (32 random bytes),
// so the same seed reproduces the same order — that's what makes the
// pre-committed hash independently verifiable after the fact.
export function seededShuffle<T>(items: readonly T[], seed: Uint8Array): T[] {
  const result = [...items];
  // Derive a deterministic stream of numbers from the seed via a simple
  // counter hashed through the seed bytes. For office-scale N this is ample.
  let counter = 0;
  const nextRand = (): number => {
    // xorshift-ish mix seeded from the bytes + counter
    let h = 0x811c9dc5 ^ counter;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed[i];
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 15;
    counter++;
    return (h >>> 0) / 0xffffffff;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateSeed(): Uint8Array {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return seed;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// The pre-commit hash: SHA-256 over the seed + the ordered entry ids +
// timestamp. Written to draw_audit_log BEFORE assignments are revealed;
// re-derivable from the published seed afterwards to prove the draw wasn't
// altered.
export async function commitHash(
  seedHex: string,
  orderedEntryIds: readonly string[],
  timestampMs: number,
): Promise<string> {
  const payload = `${seedHex}|${orderedEntryIds.join(",")}|${timestampMs}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return toHex(new Uint8Array(digest));
}
