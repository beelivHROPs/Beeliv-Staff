/**
 * Pure decision logic for "which environment is this, and may sample data exist here?".
 * No imports and no process.env reads, so it can be unit-tested; the server wrappers
 * live in lib/env/sample-data.ts. Use THAT file in app code, not this one.
 */
export type BeelivEnv = "local" | "staging" | "production";
export type Area = "admin" | "client" | "staff" | "applicant";

export type EnvDecision = {
  env: BeelivEnv;
  sampleData: boolean;
  liveAreas: ReadonlySet<Area>;
  /** Pilot menu: hide the later-stage screens from menus (presentation only; routes stay reachable). */
  pilotMenu: boolean;
};

const AREAS: readonly Area[] = ["admin", "client", "staff", "applicant"];

export function resolveEnvironment(raw: {
  BEELIV_ENV?: string;
  SAMPLE_DATA?: string;
  BEELIV_LIVE_AREAS?: string;
  BEELIV_PILOT_MENU?: string;
  NODE_ENV?: string;
}): EnvDecision {
  const named = raw.BEELIV_ENV?.trim().toLowerCase();
  // Unset: a production build is production; anything else (dev, test) is local.
  // A set-but-unrecognised value (a typo) fails SAFE to production.
  const env: BeelivEnv =
    named === "local" || named === "staging" || named === "production"
      ? named
      : named
        ? "production"
        : raw.NODE_ENV === "production"
          ? "production"
          : "local";
  // Sample data: only the EXACT values "on" / "off" are understood. Unset defaults to on for local and staging;
  // anything else (a typo, "ON", "true", " on") fails OFF. Production NEVER shows sample data, even with "on".
  const asked = raw.SAMPLE_DATA;
  const sampleData = env === "production" ? false : asked === undefined || asked === "" ? true : asked === "on";
  const liveAreas = new Set<Area>(
    (raw.BEELIV_LIVE_AREAS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is Area => (AREAS as readonly string[]).includes(s)),
  );
  return { env, sampleData, liveAreas, pilotMenu: resolvePilotMenu(env, raw.BEELIV_PILOT_MENU) };
}

/**
 * Pilot menu flag. Only the EXACT values "on" / "off" are understood. Anything else (unset, empty, a typo, "ON", " on")
 * takes the default: ON for staging and production, OFF for local so development still shows every screen.
 */
export function resolvePilotMenu(env: BeelivEnv, asked: string | undefined): boolean {
  if (asked === "on") return true;
  if (asked === "off") return false;
  return env !== "local";
}

/** An app area shows its screens when sample data is allowed, or when it has been explicitly declared live. */
export function isAreaOpen(d: EnvDecision, area: Area): boolean {
  return d.sampleData || d.liveAreas.has(area);
}

const FALLBACK_SITE = "https://beeliv.co";

/**
 * The public-site address used as a link target. Only plain https origins/paths are accepted (http only for
 * localhost, and only outside production); no username/password, no other scheme (javascript:, data:, ...).
 * Anything else falls back to https://beeliv.co.
 */
export function safePublicSiteUrl(raw: string | undefined, env: BeelivEnv): string {
  if (!raw) return FALLBACK_SITE;
  try {
    const u = new URL(raw.trim());
    if (u.username || u.password) return FALLBACK_SITE;
    const localHttp = env !== "production" && u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    if (u.protocol !== "https:" && !localHttp) return FALLBACK_SITE;
    return u.origin + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
  } catch {
    return FALLBACK_SITE;
  }
}
