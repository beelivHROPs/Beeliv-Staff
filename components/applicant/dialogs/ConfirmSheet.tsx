"use client";

/**
 * One premium confirmation surface for the whole Applicant app (project lead, 2026-10-19).
 *
 *  - ConfirmShell:   backdrop + bottom sheet with a drag handle on phones (swipe down to close) /
 *                    centred 22px card from 768px. Esc and backdrop close it, Tab stays inside,
 *                    page scroll is locked, focus returns to the opener, motion follows reduced-motion.
 *  - ConfirmHeader:  round icon disc tinted by meaning, a short title and one line of body.
 *  - ConfirmActions: the buttons. Stacked on phones (main action on top, outline under it), side by
 *                    side and right-aligned on desktop. Both 48px pills. Danger = rose filled pill.
 *
 * Meaning colours: care = sand (needs a second look), danger = rose (destructive),
 * success = sage (good news), info = lavender (neutral).
 * Used by ConfirmDialog (confirmAction), OfferAcceptedDialog and the Message HR sheet; any new
 * confirmation in the Applicant app should be built from these three, not hand-styled.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, ShieldCheck, Trash2, type LucideIcon } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { SPRING, SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";

export type ConfirmMeaning = "care" | "danger" | "success" | "info";

const DISC: Record<ConfirmMeaning, { cls: string; icon: LucideIcon }> = {
  care: { cls: "bg-(--ap-warn-bg) text-(--ap-warn)", icon: CircleAlert },
  danger: { cls: "bg-(--ap-rose-bg) text-(--ap-rose)", icon: Trash2 },
  success: { cls: "bg-(--ap-ok-bg) text-(--ap-ok)", icon: Check },
  info: { cls: "bg-(--ap-tint) text-(--ap-violet)", icon: ShieldCheck },
};

const FOCUSABLE = "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [role='combobox'], [role='checkbox']";

/** The overlay. Render it inside <ConfirmPortal> (or your own AnimatePresence) so it can animate out. */
export function ConfirmShell({
  onClose,
  busy = false,
  z = 130,
  role = "alertdialog",
  labelledBy,
  describedBy,
  width = 460,
  behind,
  children,
}: {
  onClose: () => void;
  busy?: boolean;
  z?: 130 | 150;
  role?: "alertdialog" | "dialog";
  labelledBy: string;
  describedBy?: string;
  width?: number;
  /** Decoration drawn between the backdrop and the sheet (e.g. confetti). */
  behind?: ReactNode;
  children: ReactNode;
}) {
  const isPhone = useIsPhone();
  const panel = useRef<HTMLDivElement>(null);

  // Focus in (the element marked data-autofocus, else the first control), lock scroll, restore focus on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !busy) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const f = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!f.length) return;
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

  const body = <div ref={panel}>{children}</div>;
  const aria = { role, "aria-modal": "true" as const, "aria-labelledby": labelledBy, "aria-describedby": describedBy };

  return (
    <motion.div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ zIndex: z, background: "rgba(17,17,27,.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      {behind}
      {isPhone ? (
        <SwipeSheet {...aria} onClose={() => !busy && onClose()} className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <div className="pt-4">{body}</div>
        </SwipeSheet>
      ) : (
        <motion.div
          {...aria}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={SPRING}
          style={{ width }}
          className="max-w-full rounded-[22px] bg-white p-7 shadow-[0_30px_80px_rgba(17,17,27,.28)]"
        >
          {body}
        </motion.div>
      )}
    </motion.div>
  );
}

/** Portal + presence wrapper: `<ConfirmPortal>{open ? <ConfirmShell key=... /> : null}</ConfirmPortal>`. */
export function ConfirmPortal({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<AnimatePresence>{children}</AnimatePresence>, document.body);
}

/** Icon disc, title and one line of body. */
export function ConfirmHeader({
  meaning,
  icon,
  title,
  titleId,
  body,
  bodyId,
  center = false,
  disc,
}: {
  meaning: ConfirmMeaning;
  icon?: LucideIcon;
  title: string;
  titleId: string;
  body?: ReactNode;
  bodyId?: string;
  center?: boolean;
  /** Replace the plain icon disc (e.g. the animated success mark). */
  disc?: ReactNode;
}) {
  const d = DISC[meaning];
  const Icon = icon ?? d.icon;
  return (
    <div className={center ? "flex flex-col items-center text-center" : ""}>
      {disc ?? (
        <span className={`mb-4 flex size-14 items-center justify-center rounded-full ${d.cls}`}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <h2 id={titleId} className="ap-serif text-[26px] leading-[1.15] text-(--ap-ink)">
        {title}
      </h2>
      {body ? (
        <p id={bodyId} className="mt-2 text-[15px] leading-[1.55] text-(--ap-muted)">
          {body}
        </p>
      ) : null}
    </div>
  );
}

type Action = { label: string; onClick?: () => void; href?: string; icon?: LucideIcon; busy?: boolean; disabled?: boolean; busyLabel?: string };

/**
 * Buttons. `primary` is the action the dialog is about; `secondary` is the safe way out.
 * Initial focus goes to the safe action for destructive dialogs, otherwise to the primary one.
 */
export function ConfirmActions({ primary, secondary, danger = false, focusFirstField = false }: { primary: Action; secondary?: Action; danger?: boolean; focusFirstField?: boolean }) {
  const p = `ap-btn w-full min-[768px]:w-auto ${danger ? "ap-btn-danger" : "ap-btn-p"}`;
  const Icon = primary.icon;
  const inner = primary.busy ? (
    <>
      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
      {primary.busyLabel ?? "Working…"}
    </>
  ) : (
    <>
      {Icon ? <Icon className="size-4.5" aria-hidden="true" /> : null}
      {primary.label}
    </>
  );
  const focusPrimary = !(danger && secondary);
  // Forms: leave initial focus to the shell, which picks the first field.
  const pf = focusPrimary && !focusFirstField ? { "data-autofocus": "" } : {};
  const sf = !focusPrimary && !focusFirstField ? { "data-autofocus": "" } : {};
  return (
    <div className="mt-6 flex flex-col gap-2.5 min-[768px]:flex-row-reverse min-[768px]:justify-start">
      {primary.href ? (
        <Link href={primary.href} onClick={primary.onClick} className={`${p} text-white!`} {...pf}>
          {inner}
        </Link>
      ) : (
        <button type="button" disabled={primary.disabled || primary.busy} onClick={primary.onClick} className={p} {...pf}>
          {inner}
        </button>
      )}
      {secondary ? (
        secondary.href ? (
          <Link href={secondary.href} onClick={secondary.onClick} className="ap-btn ap-btn-o w-full min-[768px]:w-auto">
            {secondary.label}
          </Link>
        ) : (
          <button
            type="button"
            disabled={secondary.disabled || primary.busy}
            onClick={secondary.onClick}
            className="ap-btn ap-btn-o w-full min-[768px]:w-auto"
            {...sf}
          >
            {secondary.label}
          </button>
        )
      ) : null}
    </div>
  );
}
