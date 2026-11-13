/**
 * SERVER ONLY. Whether `?demo=` fixtures may exist on this render. Reads the
 * server-decided auth mode (lib/auth/mode.ts, read-only): fixtures are off
 * whenever the real backend is live, and never in a production build.
 * Layouts spread the result onto their root element; see lib/dev-demo.ts.
 */
import { authMode } from "@/lib/auth/mode";
import { isProductionEnv } from "@/lib/env/sample-data";

export function demoAttr(): { "data-bv-demo"?: "on" } {
  return authMode() === "preview" && process.env.NODE_ENV !== "production" && !isProductionEnv() ? { "data-bv-demo": "on" } : {};
}
