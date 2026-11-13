/**
 * Per-portal framing for the one sign-in form. Presentation only: accent
 * colours reuse the existing app tokens (Client wine #8a3d68 / deep #321824,
 * Staff violet #5b45bf, Admin mulberry #8b2252 / deep #49152f). No new brand
 * decisions are made here.
 */
import type { Portal } from "./types";

export type PortalFrame = {
  /** Heading: "Sign in to " + accent. */
  headLead: string;
  headAccent: string;
  sub: string;
  /** Desktop brand panel copy override (null = keep the default Log in panel). */
  panel: { lead: string; accent: string; body: string } | null;
  /** Where a successful sign-in goes by default (mock; real = decided by entitlement). */
  destination: string;
};

export const PORTAL_FRAMES: Record<Portal, PortalFrame> = {
  talent: {
    headLead: "Welcome ",
    headAccent: "back.",
    sub: "Log in to continue to your dashboard.",
    panel: null,
    destination: "/applicant?from=login",
  },
  client: {
    headLead: "Sign in to ",
    headAccent: "Beeliv Client.",
    sub: "Manage your outlets, requests and team in one place.",
    panel: {
      lead: "Your team, ",
      accent: "in good hands.",
      body: "Sign in to follow your requests, schedules and reports.",
    },
    destination: "/client",
  },
  staff: {
    headLead: "Sign in to ",
    headAccent: "Beeliv Staff.",
    sub: "See your schedule, records and updates.",
    panel: {
      lead: "Your shifts, ",
      accent: "your records.",
      body: "Sign in to see your schedule, documents and messages.",
    },
    destination: "/staff",
  },
  admin: {
    headLead: "Sign in to ",
    headAccent: "Beeliv Admin.",
    sub: "For Beeliv team members only.",
    panel: {
      lead: "Beeliv operations, ",
      accent: "organised.",
      body: "Sign in to manage recruitment, clients and workforce.",
    },
    destination: "/admin",
  },
};

export function parsePortal(raw: unknown): Portal {
  return raw === "client" || raw === "staff" || raw === "admin" ? raw : "talent";
}

export const PORTAL_NAMES: Record<Portal, string> = {
  talent: "Beeliv",
  client: "Beeliv Client",
  staff: "Beeliv Staff",
  admin: "Beeliv Admin",
};

/**
 * Only same-site relative paths may be used as a post-sign-in return URL
 * (blocks open redirects such as //evil.com or https://evil.com).
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }
  return raw;
}

/**
 * Each app has its own auth pages on its own address (admin.beeliv.co,
 * client.beeliv.co later), so every in-page link (forgot password, back to sign
 * in, invitation, suspended, access denied) stays inside that app. The default
 * Talent app (Applicant) keeps the root paths.
 */
export function authPaths(portal: Portal) {
  const b = portal === "talent" ? "" : `/${portal}`;
  return {
    loginPath: `${b}/login`,
    forgotPath: `${b}/forgot-password`,
    sentPath: `${b}/forgot-password/sent`,
    resetPath: `${b}/reset-password`,
    resetSuccessPath: `${b}/reset-password/success`,
    invitePath: `${b}/invite`,
    suspendedPath: `${b}/account-suspended`,
    deniedPath: `${b}/access-denied`,
    homePath: PORTAL_FRAMES[portal].destination,
  };
}

/** Auth route segments inside an app; the app shell steps aside for these. */
export const AUTH_SEGMENTS = [
  "setup",
  "login",
  "forgot-password",
  "reset-password",
  "invite",
  "account-suspended",
  "access-denied",
] as const;

export function isAppAuthPath(pathname: string, app: "admin" | "client" | "staff"): boolean {
  return AUTH_SEGMENTS.some((s) => {
    const base = `/${app}/${s}`;
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}
