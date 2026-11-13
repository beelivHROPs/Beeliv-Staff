"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { errorReference } from "@/lib/ui/error-reference";
import { PUBLIC_CONTACT_MAILTO } from "@/lib/public-site/contact-address";

/**
 * Error and not-found screen for the Staff, Client and Admin areas. Rendered inside each area's
 * layout, so it inherits that app's tokens (violet / plum), fonts and dark mode through the
 * --ap-* variables; no colours of its own. Uses the app's primary button (ap-btn ap-btn-p) and
 * outlined button (ap-btn-o), both 44px high.
 *
 * Shows nothing taken from the error: no message, stack or URL. The only error-derived text is the
 * short Reference built from Next's opaque error.digest (see lib/ui/error-reference.ts).
 */
const CONTACT_HREF = PUBLIC_CONTACT_MAILTO; // same address as the public site footer (one source: lib/public-site/contact-address.ts)

export function AreaError({
  kind,
  homeHref,
  digest,
  onRetry,
}: {
  kind: "error" | "not-found";
  homeHref: string;
  digest?: unknown;
  onRetry?: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const reference = kind === "error" ? errorReference(digest) : "";
  const isError = kind === "error";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center px-5 py-10">
      <div className="ap-card flex w-full flex-col gap-4 p-6 text-center sm:p-8" role={isError ? "alert" : undefined}>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none"
          style={{ color: "var(--ap-ink)", fontFamily: "var(--font-newsreader), serif" }}
        >
          {isError ? "Something went wrong" : "We could not find that page"}
        </h1>
        <p className="text-base" style={{ color: "var(--ap-muted)" }}>
          {isError
            ? "We could not finish that. Please try again."
            : "The page may have moved, or the link may be incorrect."}
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center">
          {isError && onRetry ? (
            <button type="button" onClick={onRetry} className="ap-btn ap-btn-p min-h-11">
              Try again
            </button>
          ) : null}
          <Link href={homeHref} className={`ap-btn min-h-11 ${isError ? "ap-btn-o" : "ap-btn-p"}`}>
            Go to home
          </Link>
        </div>
        <a href={CONTACT_HREF} className="ap-ln inline-flex min-h-11 items-center justify-center">
          Contact Beeliv
        </a>
        {reference ? (
          <p className="text-sm" style={{ color: "var(--ap-muted)" }}>
            Reference: <span className="font-semibold tabular-nums">{reference}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
