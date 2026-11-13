import "server-only";
import { isAreaOpen, resolveEnvironment, safePublicSiteUrl, type Area, type BeelivEnv } from "./resolve";

/**
 * SERVER ONLY. The one place that decides "no sample data on a live domain".
 *
 * Env names (server-only, never NEXT_PUBLIC_):
 *   BEELIV_ENV         local | staging | production. Unset: production for a production build, else local.
 *                      A typo fails safe to production.
 *   SAMPLE_DATA        exactly "on" or "off". Unset: on for local and staging, off for production. Anything else = off.
 *                      Production ignores "on".
 *   BEELIV_LIVE_AREAS  comma list of admin,client,staff,applicant. In production this is the ONLY thing that opens an
 *                      area. KEEP IT EMPTY in production until each area's live-adapter cutover has been audited.
 *   BEELIV_PILOT_MENU  exactly "on" or "off". Hides the later-stage screens from menus, search and Home (lib/pilot/menu.ts).
 *                      Anything else: on for staging and production, off for local. Presentation only; routes stay reachable.
 *   BEELIV_PUBLIC_SITE_URL  optional https address for "back to the public site"; invalid values fall back to https://beeliv.co.
 *
 * Effect: in production, an area not listed as live shows "This area is not open yet" instead of its mock
 * screens, decided in each area's server (business) layout so the mock pages are never rendered (sign-in, invitation,
 * reset and setup routes sit outside that group and keep working); public job pages show an empty state;
 * non-production environments are noindex. Presentation only: Proxy and RLS remain the access boundary.
 */
const decision = () => resolveEnvironment(process.env);

export const beelivEnv = (): BeelivEnv => decision().env;
export const isProductionEnv = (): boolean => decision().env === "production";
export const sampleDataOn = (): boolean => decision().sampleData;
export const areaOpen = (area: Area): boolean => isAreaOpen(decision(), area);
/** Pilot menu flag as decided by the environment alone (the local-only dev override lives in lib/pilot/server.ts). */
export const pilotMenuEnv = (): boolean => decision().pilotMenu;
/** Where "back to the public site" points; the public site lives on beeliv.co. */
export const publicSiteUrl = (): string => safePublicSiteUrl(process.env.BEELIV_PUBLIC_SITE_URL, decision().env);
