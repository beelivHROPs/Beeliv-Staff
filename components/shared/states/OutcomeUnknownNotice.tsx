"use client";

import "./states.css";

/**
 * "We could not confirm completion." (shared-states.md section 4). A write got
 * no usable answer, so the page must not claim it did or did not happen.
 * Reconcile first (`onCheck` re-reads the server), retry second (`onRetry`,
 * shown only once the parent has checked and the change is not there). Never
 * replays anything by itself.
 */
export function OutcomeUnknownNotice({
  onCheck,
  checking = false,
  onRetry,
  resultMessage,
  className = "",
}: {
  onCheck: () => void;
  checking?: boolean;
  onRetry?: () => void;
  /** What the check found, in plain words (set by the parent). */
  resultMessage?: string | null;
  supportRef?: string;
  className?: string;
}) {
  return (
    <div role="alert" data-tone="warn" className={`st st-card ${className}`}>
      <p className="st-title">We could not confirm completion.</p>
      <p className="st-muted">Your entries are still here. Check first, so the same thing is not done twice.</p>
      <div role="status">{resultMessage ? <p className="st-text">{resultMessage}</p> : null}</div>
      <div className="st-row">
        <button type="button" className="st-btn" onClick={onCheck} disabled={checking} aria-disabled={checking}>
          {checking ? "Checking…" : "Check completion"}
        </button>
        {onRetry ? (
          <button type="button" className="st-btn" data-variant="secondary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
