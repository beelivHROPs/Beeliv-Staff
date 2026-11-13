import "server-only";
import type { AuthApp } from "./policy";
export function authConfig(app: AuthApp) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env[`AUTH_ORIGIN_${app.toUpperCase()}`];
  if (process.env.AUTH_BACKEND_ENABLED !== "true" || process.env.AUTH_SCHEMA_READY !== "true" || !url || !key || !origin) throw new Error("auth_unconfigured");
  const project = new URL(url); const appOrigin = new URL(origin);
  if (project.protocol !== "https:" || !project.hostname.endsWith(".supabase.co") || !key.startsWith("sb_publishable_") || appOrigin.origin !== origin || (process.env.NODE_ENV === "production" && appOrigin.protocol !== "https:")) throw new Error("auth_unconfigured");
  return { url: project.origin, key, origin, cookieName: `beeliv-${app}-auth`, rememberName: `beeliv-${app}-remember` };
}
