import { describe, expect, it } from "vitest";
import { seededShuffle, generateSeed, toHex, fromHex, commitHash } from "./engine";

describe("seededShuffle", () => {
  const entries = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("returns a permutation (no lost or duplicated entries)", () => {
    const seed = generateSeed();
    const shuffled = seededShuffle(entries, seed);
    expect([...shuffled].sort()).toEqual([...entries].sort());
    expect(shuffled).toHaveLength(entries.length);
  });

  it("is deterministic for a given seed (reproducible for audit)", () => {
    const seed = generateSeed();
    expect(seededShuffle(entries, seed)).toEqual(seededShuffle(entries, seed));
  });

  it("does not mutate the input", () => {
    const seed = generateSeed();
    const copy = [...entries];
    seededShuffle(entries, seed);
    expect(entries).toEqual(copy);
  });
});

describe("commit hash verifiability", () => {
  it("re-derives the same hash from the published seed (proves the draw wasn't altered)", async () => {
    const seed = generateSeed();
    const seedHex = toHex(seed);
    const entries = ["team_a", "team_b", "team_c"];
    const shuffled = seededShuffle(entries, seed);
    const ts = 1_700_000_000_000;

    // Committed before reveal:
    const committed = await commitHash(seedHex, shuffled.map((e) => e), ts);
    // Independently recomputed after the seed is published:
    const recomputed = await commitHash(toHex(fromHex(seedHex)), seededShuffle(entries, fromHex(seedHex)), ts);

    expect(recomputed).toBe(committed);
  });

  it("changes if the ordered entries differ (tamper-evident)", async () => {
    const seedHex = toHex(generateSeed());
    const ts = 1_700_000_000_000;
    const a = await commitHash(seedHex, ["x", "y", "z"], ts);
    const b = await commitHash(seedHex, ["x", "z", "y"], ts);
    expect(a).not.toBe(b);
  });
});
