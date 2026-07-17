import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts — the Cloudflare/React Router
// Vite plugins there assume a Workers runtime that vitest doesn't provide.
// Everything under test here (the scoring engine) is plain, runtime-agnostic TS.
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
  },
});
