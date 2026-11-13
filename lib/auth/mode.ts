/**
 * Is the real auth backend in charge, or are we previewing with development fixtures?
 *
 * SERVER ONLY (reads process.env; call it from a Server Component and pass the
 * result down as a prop). It deliberately mirrors the one switch Codex already
 * documents and uses in proxy.ts: AUTH_BACKEND_ENABLED === "true", and in a
 * production build the backend is ALWAYS live, so a production deployment can
 * never fall back to fixtures. This file invents no new flag.
 *
 * "live"    -> screens call the typed browser service (lib/auth/service.ts).
 * "preview" -> screens use the development fixtures (lib/auth/mock.ts tokens).
 */
export type AuthMode = "live" | "preview";

export function authMode(): AuthMode {
  return process.env.AUTH_BACKEND_ENABLED === "true" || process.env.NODE_ENV === "production"
    ? "live"
    : "preview";
}
