import { createContext } from "react-router";
import type { Bindings } from "../server/api/bindings";

export interface CloudflareContext {
  env: Bindings;
  ctx: ExecutionContext;
}

export const cloudflareContext = createContext<CloudflareContext>();
