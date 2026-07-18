import type { Config } from "@react-router/dev/config";

// SPA mode: no server rendering. `react-router build` emits a static client
// bundle deployable to GitHub Pages; data comes from the Cloudflare Worker API
// via clientLoaders (see app/api-client.ts). basename supports serving under a
// repo subpath (e.g. /spectrum_sweeps/) when not on a custom domain root.
export default {
  ssr: false,
  basename: process.env.PAGES_BASE ?? "/",
} satisfies Config;
