"use client";

import { useEffect, useRef, useState } from "react";

/** Anything portaled out of a popover (date pickers, dialogs) must not count as an "outside" click. */
const KEEP_OPEN = '[data-slot="popover-content"],[role="dialog"],[role="alertdialog"]';

/**
 * Open / close state for a small popover: closes on Escape (focus returns to the
 * trigger) and on a press outside the wrapper. Shared by InfoHint, MoreMenu and FiltersButton.
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Element | null;
      if (wrap.current && t && !wrap.current.contains(t) && !t.closest?.(KEEP_OPEN)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return { open, setOpen, wrap, trigger };
}
