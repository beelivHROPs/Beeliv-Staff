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
/**
 * Every top-level page has ONE home domain (truth doc section 1; docs/requirements/beeliv-talent-platform-architecture-2026-09-29.md):
 *   www.beeliv.co     public website: Home, About, For Businesses, Training, Contact, Request (Hire Talent / Book a Service Audit)
 *   talent.beeliv.co  sign-in, sign-up, verify, recovery, invitations, account states, Applicant, Staff, and Jobs
 *   admin.beeliv.co   /admin      client.beeliv.co  /client
 * A path requested on the wrong domain is sent to its home domain with the SAME path, so links never dead-end on another
 * app's sign-in. The Talent repo also carries the public site and serves it ONLY on the beeliv.co host (inert until the
 * domain points at the Beeliv-Staff project). Jobs is served on both talent.beeliv.co and beeliv.co.
 */
const SITE = "https://www.beeliv.co";
const HOME_OF: Record<string, string> = {
  about: SITE, business: SITE, contact: SITE, request: SITE, training: SITE,
  staff: "https://talent.beeliv.co", applicant: "https://talent.beeliv.co", login: "https://talent.beeliv.co", signup: "https://talent.beeliv.co",
  "verify-email": "https://talent.beeliv.co", "forgot-password": "https://talent.beeliv.co", "reset-password": "https://talent.beeliv.co",
  invite: "https://talent.beeliv.co", "access-denied": "https://talent.beeliv.co", "account-suspended": "https://talent.beeliv.co", jobs: "https://talent.beeliv.co",
  admin: "https://admin.beeliv.co", client: "https://client.beeliv.co",
};
const SITE_PAGES = ["about", "business", "contact", "request", "training", "jobs"] as const; // served on the beeliv.co host
const PUBLIC_HOST = "(www\.)?beeliv\.co";
const onPublicHost = [{ type: "host" as const, value: PUBLIC_HOST }];

export function redirectsFor(app: DeployApp | null) {
  if (!app) return [];
  const away = ALL.filter((seg) => !KEEP[app].includes(seg));
  // Talent: app-domain rules apply everywhere EXCEPT the beeliv.co host, which has its own rules below.
  const notPublic = app === "talent" ? { missing: onPublicHost } : {};
  const send = (seg: string, extra: object) => {
    const home = HOME_OF[seg];
    if (!home) return [ // e.g. design-preview: never public, back to this app's entry
      { source: `/${seg}`, destination: ENTRY[app], permanent: false, ...extra },
      { source: `/${seg}/:path*`, destination: ENTRY[app], permanent: false, ...extra },
    ];
    return [
      { source: `/${seg}`, destination: `${home}/${seg}`, permanent: false, ...extra },
      { source: `/${seg}/:path*`, destination: `${home}/${seg}/:path*`, permanent: false, ...extra },
    ];
  };
  const appRules = [{ source: "/", destination: ENTRY[app], permanent: false, ...notPublic }, ...away.flatMap((seg) => send(seg, notPublic))];
  if (app !== "talent") return appRules;
  // On beeliv.co: the website pages and Jobs are served here; every app page goes to its home domain (same path).
  const publicRules = ALL.filter((seg) => !(SITE_PAGES as readonly string[]).includes(seg)).flatMap((seg) => send(seg, { has: onPublicHost }));
  return [...appRules, ...publicRules];
}
