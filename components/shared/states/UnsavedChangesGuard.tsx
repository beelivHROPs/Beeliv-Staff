"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./states.css";

/**
 * Confirm before leaving a dirty form.
 *  - Browser tab close / reload / external navigation: native `beforeunload`.
 *  - In-app links: clicks on same-site <a href> are intercepted while `dirty`
 *    and a "Leave without saving?" dialog is shown (Stay is the default focus).
 * Render it once next to the form: <UnsavedChangesGuard dirty={isDirty} />.
 * Set dirty=false BEFORE navigating after a successful save.
 */
export function UnsavedChangesGuard({
  dirty,
  title = "Leave without saving?",
  body = "You have changes that haven't been saved. If you leave now, they will be lost.",
}: {
  dirty: boolean;
  title?: string;
  body?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // beforeunload covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      setTarget(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (target && !d.open) {
      d.showModal();
      stayRef.current?.focus();
    } else if (!target && d.open) d.close();
  }, [target]);

  return (
    <dialog
      ref={dialogRef}
      className="st st-dialog"
      aria-labelledby="st-leave-title"
      onCancel={(e) => {
        e.preventDefault();
        setTarget(null);
      }}
      onClose={() => setTarget(null)}
    >
      <h2 id="st-leave-title">{title}</h2>
      <p>{body}</p>
      <div className="st-row">
        <button
          type="button"
          className="st-btn"
          data-variant="secondary"
          onClick={() => {
            const t = target;
            setTarget(null);
            if (t) router.push(t);
          }}
        >
          Leave
        </button>
        <button ref={stayRef} type="button" className="st-btn" onClick={() => setTarget(null)}>
          Stay on this page
        </button>
      </div>
    </dialog>
  );
}
