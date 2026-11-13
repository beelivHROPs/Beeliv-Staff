"use client";

/**
 * No-form invitation states (rev-2 wire contract: docs/contracts/auth-invitation-wire.md).
 *
 * - InvitationUnavailable: the ONE generic "no longer available" card. Invalid,
 *   expired, revoked, used and never-existed links all look identical. It names
 *   no inviter, organisation, role or reason.
 * - InvitationTemporaryFailure: the link could not be CHECKED (outage, 429, 503,
 *   timeout, malformed reply). Never claims the link is invalid or expired.
 * - InvitationChecking: the short wait while the browser asks the server.
 */

import { useState } from "react";
import { authPaths } from "@/lib/auth/portals";
import type { ApiError, Portal } from "@/lib/auth/types";
import { RateLimitNotice } from "@/components/shared/states/RateLimitNotice";
import { ServiceError } from "@/components/shared/states/ServiceError";
import { AlertIcon } from "./AuthIcons";
import { StatusPanel } from "./StatusPanel";

/** The framed app for a route. The shared Talent route has no app accent before the link is verified. */
export type FramePortal = "client" | "staff" | "admin" | undefined;
export const framePortalOf = (routePortal: Portal): FramePortal =>
  routePortal === "talent" ? undefined : routePortal;

export function InvitationUnavailable({ routePortal }: { routePortal: Portal }) {
  const paths = authPaths(routePortal);
  return (
    <StatusPanel
      portal={framePortalOf(routePortal)}
      icon={<AlertIcon size={26} strokeWidth={1.7} />}
      lead="This link is "
      accent="no longer available."
      sub="It may have expired (invitations last 7 days) or already been used. Ask Beeliv to send you a new one."
      panel={{ lead: "Need a ", accent: "new invitation?", body: "Contact Beeliv and we'll send you a fresh link.", back: { href: paths.loginPath, label: "Back to log in" } }}
      primary={{ href: "/contact", label: "Contact Beeliv →" }}
      foot={{ lead: "Already have an account? ", href: paths.loginPath, label: "Log in" }}
    />
  );
}

export function InvitationChecking({ routePortal }: { routePortal: Portal }) {
  const paths = authPaths(routePortal);
  return (
    <StatusPanel
      portal={framePortalOf(routePortal)}
      icon={<AlertIcon size={26} strokeWidth={1.7} />}
      screen="reset"
      lead="Checking your "
      accent="invitation."
      sub="One moment."
      panel={{ lead: "Welcome to ", accent: "Beeliv.", body: "We're opening your invitation.", back: { href: paths.loginPath, label: "Back to log in" } }}
    />
  );
}

export function InvitationTemporaryFailure({
  routePortal,
  error,
  retrying,
  onRetry,
}: {
  routePortal: Portal;
  error: ApiError;
  retrying: boolean;
  onRetry: () => void;
}) {
  const paths = authPaths(routePortal);
  // The wait is cosmetic (the server enforces it); Retry appears once it has elapsed.
  const [waitedFor, setWaitedFor] = useState<ApiError | null>(null);
  const waiting = !!error.retryAfterSeconds && waitedFor !== error;
  return (
    <StatusPanel
      portal={framePortalOf(routePortal)}
      icon={<AlertIcon size={26} strokeWidth={1.7} />}
      screen="reset"
      lead="We couldn't load "
      accent="your invitation."
      sub="Try again."
      panel={{ lead: "Just a ", accent: "moment.", body: "This is a temporary problem. Please try again.", back: { href: paths.loginPath, label: "Back to log in" } }}
      foot={{ lead: "Already have an account? ", href: paths.loginPath, label: "Log in" }}
    >
      {waiting ? (
        <RateLimitNotice
          key={error.retryAfterSeconds}
          retryAfterSeconds={error.retryAfterSeconds!}
          message="Please wait a moment."
          onElapsed={() => setWaitedFor(error)}
        />
      ) : (
        <ServiceError
          title="This is a temporary problem"
          error={{ message: "We couldn't check this link just now. Try again in a moment.", supportRef: error.supportRef }}
          onRetry={onRetry}
          retrying={retrying}
          retryLabel="Retry"
          focusOnMount
        />
      )}
    </StatusPanel>
  );
}
