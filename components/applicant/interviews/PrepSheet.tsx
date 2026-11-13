"use client";

/**
 * "Before you join": the short prep list in a bottom sheet (phones and tablets; swipe the handle down to close).
 * On wide screens the same list sits inline in the page (see InterviewsBody), so this sheet is not used there.
 */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { SwipeSheet, useIsClient } from "@/components/applicant/motion";

export function PrepList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-none flex-col gap-3">
      {items.map((p) => (
        <li key={p} className="flex items-start gap-3 text-[16px] leading-snug text-(--ap-ink-2)">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
            <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          {p}
        </li>
      ))}
    </ul>
  );
}

export function PrepSheet({ open, items, onClose }: { open: boolean; items: string[]; onClose: () => void }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<AnimatePresence>{open ? <Panel key="panel" items={items} onClose={onClose} /> : null}</AnimatePresence>, document.body);
}

function Panel({ items, onClose }: { items: string[]; onClose: () => void }) {
  const titleId = useId();
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  return (
    <motion.div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[150] flex items-end justify-center`}
      style={{ background: "rgba(17,17,27,.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if (e.key === "Tab") {
          // Keep focus inside the sheet: it has two buttons (close, Got it).
          const f = [...e.currentTarget.querySelectorAll<HTMLElement>("button")];
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <SwipeSheet onClose={onClose} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-w-[560px] px-6 pt-1 pb-8">
        <div className="mt-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="ap-serif text-[24px] leading-[1.15] text-(--ap-ink)">
            Before you join
          </h2>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="-mt-2 -mr-2 flex size-12 items-center justify-center rounded-full text-(--ap-muted) hover:bg-(--ap-tint)">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 mb-5 text-[15px] text-(--ap-muted)">A few small things that help it go smoothly.</p>
        <PrepList items={items} />
        <button type="button" onClick={onClose} className="ap-btn ap-btn-p mt-7 w-full text-white!">
          Got it
        </button>
      </SwipeSheet>
    </motion.div>
  );
}
