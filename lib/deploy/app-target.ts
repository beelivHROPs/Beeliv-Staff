/**
 * Which ONE app a deployment serves (truth doc section 1 and section 11; CLAUDE.md 2026-09-29 / 2026-09-30):
 *   beelivHROPs/Beeliv-Admin  -> admin.beeliv.co   -> Admin (HR + Operations)
 *   beelivHROPs/Beeliv-Client -> client.beeliv.co  -> Client
 *   beelivHROPs/Beeliv-Staff  -> talent.beeliv.co  -> Talent (Applicant + Staff, one auth)
 *   the public site stays on beeliv.co (not one of these three).
 *
 * Each deployment repo commits `beeliv-deploy.json` ({"app":"admin"|"client"|"talent"}); next.config.ts turns it into
 * redirects so that deployment only serves its own app: the homepage and every other app's pages go to this app's
 * entry. No file (this monorepo, local dev) = no redirects. Temporary (307) redirects, so they are easy to change.
 * Pure, no imports: next.config.ts reads the file and passes the value in.
 */
export type DeployApp = "admin" | "client" | "talent";

/** Every top-level page path in the app (from the build's route list). api, privacy and terms are shared by all. */
const ALL = ["about", "access-denied", "account-suspended", "admin", "applicant", "business", "client", "contact", "design-preview", "forgot-password", "invite", "jobs", "login", "request", "reset-password", "signup", "staff", "training", "verify-email"] as const;

/** Top-level paths each app keeps. */
const KEEP: Record<DeployApp, readonly string[]> = {
  admin: ["admin"],
  client: ["client"],
  // Talent (approved routing, docs/requirements/beeliv-talent-platform-architecture-2026-09-29.md): /login, /signup,
  // /verify, /forgot-password, /reset-password, /invite, /applicant, /staff, plus the account-state pages.
  // Jobs and Job Detail live on beeliv.co with the public site, not here.
  talent: ["staff", "applicant", "login", "signup", "verify-email", "forgot-password", "reset-password", "invite", "access-denied", "account-suspended"],
};
const ENTRY: Record<DeployApp, string> = { admin: "/admin", client: "/client", talent: "/login" };

export function parseDeployApp(value: unknown): DeployApp | null {
  return value === "admin" || value === "client" || value === "talent" ? value : null;
}

export function redirectsFor(app: DeployApp | null) {
  if (!app) return [];
  const away = ALL.filter((seg) => !KEEP[app].includes(seg));
  return [
    { source: "/", destination: ENTRY[app], permanent: false },
    ...away.flatMap((seg) => [
      { source: `/${seg}`, destination: ENTRY[app], permanent: false },
      { source: `/${seg}/:path*`, destination: ENTRY[app], permanent: false },
    ]),
  ];
}
