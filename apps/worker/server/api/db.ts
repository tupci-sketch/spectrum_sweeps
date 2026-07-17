import { createDb } from "@spectrum-sweeps/db";
import type { Bindings } from "./bindings";

export function getDb(env: Bindings) {
  return createDb(env.DB);
}
