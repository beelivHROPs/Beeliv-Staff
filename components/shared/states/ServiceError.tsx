"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ApiError } from "@/lib/auth/types";
import "./states.css";

/**
 * A failed read or action. Shows only the safe message, never diagnostic
 * references, raw error text, stack traces or codes. role="alert".
 *
 * Input is never cleared by this component: the parent keeps its own state and
 * `onRetry` re-runs the same action.
 */
export function ServiceError({
  title = "Something went wrong",
  error,
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  focusOnMount = false,
  extraAction,
  id,
  className = "",
}: {
  title?: string;
  error: Pick<ApiError, "message" | "supportRef">;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  /** Move keyboard focus here when it appears (use after a submit). */
  focusOnMount?: boolean;
  /** An optional second action shown next to "Try again" (e.g. a secondary st-btn). */
  extraAction?: ReactNode;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: false });
  }, [focusOnMount, error]);

  return (
    <div
      ref={ref}
      id={id}
      role="alert"
      tabIndex={-1}
      data-tone="danger"
      className={`st st-card outline-none ${className}`}
    >
      <p className="st-title">{title}</p>
      <p className="st-text">{error.message}</p>
      {(onRetry || extraAction) && (
        <div className="st-row">
          {onRetry && (
            <button
              type="button"
              className="st-btn"
              onClick={onRetry}
              aria-disabled={retrying}
              disabled={retrying}
            >
              {retrying ? "Trying again…" : retryLabel}
            </button>
          )}
          {extraAction}
        </div>
      )}
    </div>
  );
}
