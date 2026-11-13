"use client";

/**
 * "Incomplete form" feedback for the Applicant and Staff apps. Mirrors the
 * public site's auth forms (components/public/auth/fields.tsx): on an invalid
 * submit every invalid field shakes (restarting each time), the first one is
 * scrolled to centre and focused.
 *
 * How a form uses it:
 *   1. mark invalid controls with aria-invalid="true" (or data-ap-invalid on a
 *      non-control block such as a warning line) and show a <FieldError>;
 *   2. wrap each field in an element with data-ap-field (the shared Field
 *      components already do) so label + control + message shake together;
 *   3. on submit: set the error state, then call `flag()` from
 *      useFlagInvalid(containerRef). The call runs after React has rendered
 *      the aria-invalid attributes.
 */
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from "react";

const INVALID = '[aria-invalid="true"], [data-ap-invalid]';
const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-ap-reduce-motion");
}

function visible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

/** The element to focus for an invalid marker: the control itself, or the trigger inside a custom control. */
function focusTargetFor(el: HTMLElement): HTMLElement | null {
  if (el.matches("input, select, textarea, button")) return el;
  const chosen = el.querySelector<HTMLElement>('input:checked, [aria-pressed="true"], [aria-checked="true"]');
  return chosen ?? el.querySelector<HTMLElement>(FOCUSABLE);
}

function restartShake(el: HTMLElement) {
  el.classList.remove("ap-shake");
  void el.offsetWidth; // reflow, so the animation restarts on every press
  el.classList.add("ap-shake");
  el.addEventListener("animationend", () => el.classList.remove("ap-shake"), { once: true });
}

/** Shake every invalid field in `container`; scroll to and focus the first. */
export function flagInvalid(container: HTMLElement | null): void {
  if (!container) return;
  const invalid = Array.from(container.querySelectorAll<HTMLElement>(INVALID)).filter(visible);
  if (invalid.length === 0) return;

  const targets = new Set<HTMLElement>();
  for (const el of invalid) targets.add(el.closest<HTMLElement>("[data-ap-field]") ?? el);
  targets.forEach(restartShake);

  const first = invalid[0];
  const anchor = first.closest<HTMLElement>("[data-ap-field]") ?? first;
  anchor.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  focusTargetFor(first)?.focus({ preventScroll: true });
}

/**
 * Returns a `flag()` function. Call it in the submit handler right after
 * setting the error state; the flagging happens once React has committed.
 */
export function useFlagInvalid(container: RefObject<HTMLElement | null>): () => void {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n > 0) flagInvalid(container.current);
  }, [n, container]);
  return useCallback(() => setN((x) => x + 1), []);
}

/** Inline reason under an invalid field. Give it an id and point aria-describedby at it. */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-[13px] font-semibold text-(--ap-rose)">
      {children}
    </p>
  );
}

/**
 * Spread onto custom controls (button triggers, role="group" wrappers) that
 * are not strictly allowed to carry aria-invalid in ARIA 1.2 but are the
 * marker flagInvalid() looks for.
 */
export function invalidAttrs(bad: boolean): { "aria-invalid"?: true } {
  return bad ? { "aria-invalid": true } : {};
}
