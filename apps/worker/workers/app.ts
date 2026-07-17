import { createRequestHandler, RouterContextProvider } from "react-router";
import { api } from "../server/api";
import { cloudflareContext } from "../app/context";
import type { Bindings } from "../server/api/bindings";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Hono owns /api/*; everything else renders through React Router.
    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Bindings>;
