"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./states.css";

/**
 * "Your session ended. Sign in again to carry on." Modal over the current page.
 * Sign in goes to the portal's sign-in with `next` = the page the person was
 * on, so they return to the same URL. This component never touches form state:
 * the page underneath keeps whatever was typed (the dialog is non-destructive
 * and the page is not reloaded).
 *
 * `returnUrl` must be a same-site path (it is checked again by /login).
 * Escape is intentionally ignored: the session really has ended.
 */
export function SessionExpiredDialog({
  open,
  returnUrl,
  signInHref,
  onSignIn,
}: {
  open: boolean;
  returnUrl: string;
  /** Sign-in page for this portal, e.g. "/login?portal=client". */
  signInHref: string;
  /** Optional hook (e.g. to stash unsaved input in memory before leaving). */
  onSignIn?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  const sep = signInHref.includes("?") ? "&" : "?";
  const href = `${signInHref}${sep}next=${encodeURIComponent(returnUrl)}`;

  return (
    <dialog
      ref={ref}
      className="st st-dialog"
      aria-labelledby="st-session-title"
      onCancel={(e) => e.preventDefault()}
    >
      <h2 id="st-session-title">Your session ended</h2>
      <p>Sign in again to carry on. You&apos;ll come back to this page.</p>
      <div className="st-row">
        <Link href={href} className="st-btn" onClick={onSignIn} autoFocus>
          Sign in
        </Link>
      </div>
    </dialog>
  );
}
