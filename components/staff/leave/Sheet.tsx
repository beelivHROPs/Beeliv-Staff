"use client";

/**
 * Detail sheet: bottom sheet on phones (swipe the handle down to close),
 * right-hand panel from 768px up. Same portal + `applicant-shell` wrapper as
 * ConfirmDialog so the Staff tokens (html.staff-app) reach it. Esc, the
 * backdrop and the close button all close it; page scroll is locked while open.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { SPRING, SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<AnimatePresence>{open ? <Panel key="sheet" title={title} onClose={onClose}>{children}</Panel> : null}</AnimatePresence>, document.body);
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const isPhone = useIsPhone();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus in, lock scroll, restore focus on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  const header = (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 min-[768px]:px-7 min-[768px]:pt-6">
      <h2 id={titleId} className="text-[24px] leading-[1.15] font-bold text-(--ap-ink)">{title}</h2>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-ink-2) transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
        <X className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <motion.div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[120] flex items-end justify-center min-[768px]:justify-end`}
      style={{ background: "rgba(17,17,27,.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {isPhone ? (
        <SwipeSheet role="dialog" aria-modal="true" aria-labelledby={titleId} onClose={onClose} className="max-h-[88dvh] overflow-y-auto pb-[calc(20px+env(safe-area-inset-bottom))]">
          {header}
          <div className="px-5">{children}</div>
        </SwipeSheet>
      ) : (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={SPRING}
          className="h-full w-[480px] max-w-full overflow-y-auto bg-(--ap-surface,#fff) shadow-[-20px_0_60px_rgba(17,17,27,.2)]"
        >
          {header}
          <div className="px-7 pb-8">{children}</div>
        </motion.div>
      )}
    </motion.div>
  );
}
