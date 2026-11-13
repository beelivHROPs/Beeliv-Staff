"use client";

/**
 * Shared keyboard behaviour for modal dialogs and sheets (presentation only).
 *
 *  - on open, focus moves into the dialog (an element that already took focus, e.g. via autoFocus, is kept);
 *  - Tab and Shift+Tab stay inside the dialog;
 *  - Escape calls `onClose` without needing a click first (the listener is on the document, not on the
 *    sheet, so it works while focus is still on the page behind);
 *  - on close, focus returns to the control that opened it.
 *
 * Use: `const ref = useDialogFocus<HTMLDivElement>(busy ? undefined : onClose);` then put `ref`
 * and `tabIndex={-1}` on the element that has role="dialog" / aria-modal. Pass no `onClose` (or undefined)
 * to disable Escape, for example while a save is running.
 *
 * Popups portalled outside the dialog (time picker, select list) keep their own focus: the trap only wraps
 * at the dialog's own edges, and Escape is ignored while such a popup is open or already handled the key. With several dialogs open, only the
 * newest one reacts. This is not access control or security; it is keyboard and screen-reader support.
 */
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
const OPENER_SELECTOR = 'button,a[href],input,select,textarea,summary,[role="button"],[role="combobox"],[tabindex]';

/** Open dialogs, oldest first. Only the last one handles Tab and Escape. */
const stack: symbol[] = [];

/** The control the user last used outside any dialog: the one to return to on close. */
let lastOutside: HTMLElement | null = null;
const inDialog = (el: Element | null) => !!el?.closest('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]');
if (typeof document !== "undefined") {
  const remember = (e: Event) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || inDialog(t)) return;
    const el = t.closest<HTMLElement>(OPENER_SELECTOR);
    if (el) lastOutside = el;
  };
  document.addEventListener("focusin", remember, true);
  document.addEventListener("pointerdown", remember, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") remember(e);
  }, true);
}

const visible = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
const focusables = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);

export function useDialogFocus<T extends HTMLElement = HTMLElement>(onClose?: () => void): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  const opener = useRef<HTMLElement | null>(null);
  const started = useRef(false);
  const rootEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Move focus in once the dialog element exists (some dialogs render nothing until after hydration).
  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    started.current = true;
    rootEl.current = el;
    opener.current = lastOutside && document.contains(lastOutside) ? lastOutside : null;
    if (!el.contains(document.activeElement)) (focusables(el)[0] ?? el).focus({ preventScroll: true });
  });

  useEffect(() => {
    const id = Symbol("dialog");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      const root = ref.current;
      if (!root) return;
      if (e.key === "Escape") {
        const active = document.activeElement;
        // A popup opened from inside (time picker, select list) closes first and keeps its own Escape handling.
        const popupAbove = Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
          (n) => n !== root && !root.contains(n) && !n.contains(root) && root.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
        if (e.defaultPrevented || popupAbove || active?.getAttribute("aria-expanded") === "true" || active?.closest('[role="listbox"],[role="menu"]')) return;
        if (closeRef.current) {
          e.preventDefault();
          closeRef.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables(root);
      const active = document.activeElement as HTMLElement | null;
      if (list.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      if (!active || !root.contains(active)) {
        // Focus escaped (for example to the page behind): bring it back, unless it sits in a popup of ours.
        if (inDialog(active) && active !== root) return;
        e.preventDefault();
        (e.shiftKey ? list[list.length - 1] : list[0]).focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      const back = opener.current;
      started.current = !!rootEl.current && document.contains(rootEl.current);
      // Restore only on a real close: in React Strict Mode (dev) effects are torn down and re-run while the dialog stays mounted.
      if (back && document.contains(back)) {
        requestAnimationFrame(() => {
          if (rootEl.current && document.contains(rootEl.current)) return;
          back.focus({ preventScroll: true });
        });
      }
    };
  }, []);

  return ref;
}
