"use client";

/**
 * Small shared pieces for the Operations Clients & HR, Reports and Setup
 * screens: one container style (1px border, 14px radius, hairline dividers, no
 * shadow, no nested cards), a quiet banner, the phone back-arrow header and the
 * sheet (bottom sheet on phones, side sheet from 768px). Reused inside this
 * slice only.
 */
import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNoticeSound } from "@/lib/admin/use-notice-sound";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { ChevronLeft, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import "./opsx.css";

/** The one container: border, radius, surface, no shadow. Rows inside use `ROW_LINE`. */
export const GROUP = "overflow-hidden rounded-[14px] border border-(--ap-line) bg-(--ap-surface)";
export const ROW_LINE = "border-t border-(--ap-line-2) first:border-t-0";
/** Small uppercase group heading above a container. */
export const GROUP_HEAD = "mb-2 px-1 text-[12px] font-semibold tracking-[.08em] text-(--ap-muted) uppercase";
export const MUTED_NOTE = "text-[12px] leading-snug text-(--ap-muted)";
/** The one main button on a screen. */
export const MAIN_BTN = "ap-btn ap-btn-p h-11 rounded-full px-5 text-[14px] font-semibold text-white!";
export const QUIET_BTN = "ap-btn ap-btn-s h-11 rounded-full px-5 text-[14px] font-semibold";

export function Banner({ tone, children, action, onDismiss }: { tone: "ok" | "warn" | "bad"; children: ReactNode; action?: ReactNode; onDismiss?: () => void }) {
  // Sound cue: ok = saved (Assign HR confirmed, setup saved), bad = error. "warn" stays silent.
  useNoticeSound(tone === "ok" ? "ok" : tone === "bad" ? "error" : null, typeof children === "string" ? children : tone);
  const cls = tone === "ok" ? "border-(--ap-ok) bg-(--ap-ok-bg)" : tone === "warn" ? "border-(--ap-warn) bg-(--ap-warn-bg)" : "border-(--ap-rose) bg-(--ap-rose-bg)";
  return (
    <div role={tone === "ok" ? "status" : "alert"} className={`opsx-fade mb-4 flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[14px] leading-[1.5] text-(--ap-ink) ${cls}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="ap-hit -my-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** Phone inner-screen header: back arrow + title. Desktop shows nothing (it uses a text link + PageHeading). */
export function BackHeader({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1 min-[768px]:hidden">
      <Link href={href} aria-label={`Back to ${label}`} className="ap-hit -ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-ink) active:bg-(--ap-line-2)">
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 flex-1 text-[20px] leading-tight font-semibold text-(--ap-ink)">{title}</h1>
    </div>
  );
}

/** Desktop text back link (hidden on phones, which have BackHeader). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="ap-hit mb-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> {label}
    </Link>
  );
}

const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

/**
 * Bottom sheet on phones, side sheet from 768px. Esc, the backdrop and the close
 * button dismiss it unless `busy` (a save is in flight). Focus moves in, stays
 * inside, and returns to the opener on close. `footer` stays visible while the
 * body scrolls.
 */
export function Sheet({ title, subtitle, onClose, busy = false, footer, children, low = false }: { title: string; subtitle?: string; onClose: () => void; busy?: boolean; footer?: ReactNode; children: ReactNode; /** Sits under the app's own date-picker sheet (z 120), so a DatePicker inside can open above it. */ low?: boolean }) {
  const isClient = useIsClient();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isClient) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [isClient]);

  if (!isClient) return null;
  return createPortal(
    <div
      className={`${ADMIN_THEME} opsx-fade fixed inset-0 ${low ? "z-[115]" : "z-[130]"} flex items-end justify-center min-[768px]:items-stretch min-[768px]:justify-end`}
      style={{ background: "rgba(17,17,27,.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) {
          e.stopPropagation();
          onClose();
          return;
        }
        if (e.key !== "Tab" || !panel.current) return;
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        className="opsx-up flex max-h-[90dvh] w-full flex-col rounded-t-[16px] border-t border-(--ap-line) bg-(--ap-surface) text-(--ap-ink) outline-none min-[768px]:max-h-none min-[768px]:w-[440px] min-[768px]:rounded-none min-[768px]:rounded-l-[16px] min-[768px]:border-t-0 min-[768px]:border-l"
      >
        <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-9 shrink-0 rounded-full bg-(--ap-line) min-[768px]:hidden" />
        <div className="flex items-start gap-2 px-5 pt-3 pb-2 min-[768px]:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-t`} className="text-[18px] leading-tight font-semibold">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-[13px] text-(--ap-muted)">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="ap-hit -mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-muted) hover:bg-(--ap-line-2) disabled:opacity-40">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? <div className="border-t border-(--ap-line-2) px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** A real toggle control (the app's `ap-switch` style). */
export function Toggle({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className="ap-switch shrink-0 disabled:cursor-not-allowed disabled:opacity-50" />;
}
