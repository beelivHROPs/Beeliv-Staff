import { StatusPanel } from "./StatusPanel";
import { AlertIcon, ShieldCheckIcon } from "./AuthIcons";
import { PORTAL_NAMES, authPaths, parsePortal } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";

const frameOf = (p: Portal) => (p === "talent" ? undefined : p);

/**
 * Shown after sign-in when the account is suspended or deactivated. No reason
 * is ever shown (contract: auth-and-invitations.md section 2). Used by the
 * shared /account-suspended and each app's own /<app>/account-suspended.
 */
export function AccountSuspended({ portal = "talent" }: { portal?: Portal }) {
  const paths = authPaths(portal);
  return (
    <StatusPanel
      portal={frameOf(portal)}
      icon={<AlertIcon size={26} strokeWidth={1.7} />}
      lead="This account is not "
      accent="active."
      sub="Please contact Beeliv."
      panel={{
        lead: "We're here ",
        accent: "to help.",
        body: "Get in touch and the Beeliv team will take it from here.",
        back: { href: paths.loginPath, label: "Back to log in" },
      }}
      primary={{ href: "/contact", label: "Contact Beeliv →" }}
      foot={{ lead: "Wrong account? ", href: paths.loginPath, label: "Back to log in" }}
    />
  );
}

/**
 * Signed in, but not entitled to the area asked for. One neutral message,
 * never naming another organisation or person. `available` (MOCK: the server
 * will decide this) offers the portal this person CAN use.
 */
export function AccessDenied({
  portal = "talent",
  available: rawAvailable,
}: {
  portal?: Portal;
  available?: unknown;
}) {
  const paths = authPaths(portal);
  const available = parsePortal(rawAvailable);
  const hasAlt = available !== "talent";
  return (
    <StatusPanel
      portal={frameOf(portal)}
      icon={<ShieldCheckIcon size={26} strokeWidth={1.7} />}
      lead="You don't have access to "
      accent="this area."
      sub="If you think this is a mistake, contact Beeliv."
      panel={{
        lead: "This area ",
        accent: "isn't open to you.",
        body: "You can still use the parts of Beeliv your account is set up for.",
        back: { href: paths.loginPath, label: "Back to log in" },
      }}
      primary={
        hasAlt
          ? { href: authPaths(available).homePath, label: `Go to ${PORTAL_NAMES[available]} →` }
          : { href: paths.loginPath, label: "Back to log in →" }
      }
      foot={hasAlt ? { lead: "Need help? ", href: "/contact", label: "Contact Beeliv" } : undefined}
    />
  );
}
