/**
 * Which data source Team & Access uses (mock fixtures or the real invitation endpoints).
 *
 * The decision is made on the SERVER (lib/server/auth/team-access-mode.ts) and handed to the browser by
 * <TeamAccessModeProvider> in the Admin layout, the same way org-records does it. Browser code cannot read
 * the environment itself. Until the provider has run, a production build fails SAFE to "live" (never
 * fixtures); a development build uses "mock", exactly as before.
 */
export type TeamAccessMode = "mock" | "live";
export type TeamAccessConfig = { mode: TeamAccessMode };

let config: TeamAccessConfig = { mode: process.env.NODE_ENV === "production" ? "live" : "mock" };

export function setTeamAccessConfig(next: TeamAccessConfig): void {
  config = next;
}
export const teamAccessMode = (): TeamAccessMode => config.mode;
