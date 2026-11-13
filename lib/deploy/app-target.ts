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
  // Jobs: lead 2026-11-13, "we are using the admin, client and other repo": only these three repos are used, so the
  // confirmed recruitment entry (truth doc 6B: browse jobs, job detail, apply, account) is served here.
  talent: ["staff", "applicant", "login", "signup", "verify-email", "forgot-password", "reset-password", "invite", "access-denied", "account-suspended", "jobs"],
};
// Entry = each app's sign-in page: it always renders, and signed-in people are sent on to their workspace from there.
const ENTRY: Record<DeployApp, string> = { admin: "/admin/login", client: "/client/login", talent: "/login" };

export function parseDeployApp(value: unknown): DeployApp | null {
  return value === "admin" || value === "client" || value === "talent" ? value : null;
}

/**
 * The public site (Home, About, For Businesses, Training, Contact, Request, Jobs) belongs on beeliv.co. Only three repos
 * are used (lead 2026-11-13), so the Talent repo also carries it and serves it ONLY when the request's host is
 * beeliv.co / www.beeliv.co. On talent.beeliv.co (and any other host) those pages still redirect to sign-in. Inert until
 * beeliv.co is pointed at the Beeliv-Staff Vercel project.
 */
const PUBLIC_HOST = "(www\.)?beeliv\.co";
const onPublicHost = [{ type: "host" as const, value: PUBLIC_HOST }];
const TALENT_ONLY = ["staff", "applicant", "login", "signup", "verify-email", "forgot-password", "reset-password", "invite", "access-denied", "account-suspended"];

export function redirectsFor(app: DeployApp | null) {
  if (!app) return [];
  const away = ALL.filter((seg) => !KEEP[app].includes(seg));
  // Talent: these app-only rules apply everywhere EXCEPT beeliv.co, where the public site is served instead.
  const notPublic = app === "talent" ? { missing: onPublicHost } : {};
  const appRules = [
    { source: "/", destination: ENTRY[app], permanent: false, ...notPublic },
    ...away.flatMap((seg) => [
      { source: `/${seg}`, destination: ENTRY[app], permanent: false, ...notPublic },
      { source: `/${seg}/:path*`, destination: ENTRY[app], permanent: false, ...notPublic },
    ]),
  ];
  if (app !== "talent") return appRules;
  // On beeliv.co: Talent pages go to talent.beeliv.co (same path), and Admin / Client to their own sign-in.
  const toSub = (seg: string, origin: string, keepPath: boolean) => [
    { source: `/${seg}`, has: onPublicHost, destination: keepPath ? `${origin}/${seg}` : origin, permanent: false },
    { source: `/${seg}/:path*`, has: onPublicHost, destination: keepPath ? `${origin}/${seg}/:path*` : origin, permanent: false },
  ];
  return [
    ...appRules,
    ...TALENT_ONLY.flatMap((seg) => toSub(seg, "https://talent.beeliv.co", true)),
    ...toSub("admin", "https://admin.beeliv.co/admin/login", false),
    ...toSub("client", "https://client.beeliv.co/client/login", false),
  ];
}
