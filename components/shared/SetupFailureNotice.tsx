"use client";

import Link from "next/link";
import "@/components/shared/states/states.css";
import { RateLimitNotice } from "@/components/shared/states";
import { SetupActionError } from "@/lib/admin/setup/types";

/**
 * Safe failure for setup writes that are NOT conflict / unknown-outcome (those
 * have their own notices): no_access, suspended, unauthenticated, mfa_required,
 * rate_limited (with the server's retry timing), unavailable. The text shown is
 * the backend's safe message; never diagnostic references, provider detail
 * or a guess. Unauthenticated adds the one safe next step (sign in).
 */
export function SetupFailureNotice({ error, signInHref, onElapsed, className = "" }: { error: SetupActionError; signInHref: string; onElapsed: () => void; className?: string }) {
  if (error.code === "rate_limited" && error.retryAfterSeconds) {
    return <RateLimitNotice className={className} retryAfterSeconds={error.retryAfterSeconds} onElapsed={onElapsed} message={error.message} />;
  }
  return (
    <div role="alert" data-tone={error.code === "suspended" || error.code === "no_access" ? "danger" : "warn"} className={`st st-card ${className}`}>
      <p className="st-title">{error.message}</p>
      {error.code === "mfa_required" ? <p className="st-muted">Finish the authenticator step first, then try again.</p> : null}
      {error.code === "unauthenticated" ? (
        <div className="st-row">
          <Link href={signInHref} className="st-btn">
            Sign in again
          </Link>
        </div>
      ) : null}
    </div>
  );
}
