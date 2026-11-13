"use client";

/**
 * The quiet "..." button of a page header: secondary actions and links live
 * here so the header keeps ONE primary action. Items are links (href) or
 * actions (onSelect); optional `children` render below a hairline (notes, audit lines).
 */
import Link from "next/link";
import { useId, type ReactNode } from "react";
import type { LucideIcon } from "@/components/applicant/icons";
import { usePopover } from "./usePopover";

export interface MoreItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  /** Small trailing text, e.g. a count. */
  meta?: ReactNode;
}

export interface MoreSection {
  title?: string;
  items: MoreItem[];
}

/** The quiet "..." trigger: a hairline-outline round icon button, never filled, so it cannot read as a second primary action. */
export const QUIET_ICON_BTN = "ap-hit inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--ap-line) bg-transparent text-(--ap-ink-2) transition-colors hover:bg-(--ap-line-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

const ROW = "flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

export function MoreMenu({ sections, label = "More", children }: { sections: MoreSection[]; label?: string; children?: ReactNode }) {
  const { open, setOpen, wrap, trigger } = usePopover();
  const id = useId();
  const shown = sections.filter((s) => s.items.length > 0);
  if (shown.length === 0 && !children) return null;
  return (
    <div ref={wrap} className="relative">
      <button ref={trigger} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} className={QUIET_ICON_BTN}>
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div id={id} className="ap-pop-in absolute top-[calc(100%+6px)] right-0 z-[150] w-[min(300px,calc(100vw-32px))] rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-2 shadow-(--ap-shadow)">
          {shown.map((s, i) => (
            <div key={s.title ?? i} role="menu" aria-label={s.title ?? label} className={i > 0 ? "mt-1.5 border-t border-(--ap-line-2) pt-1.5" : ""}>
              {s.title ? <p className="px-3 pt-1 pb-1 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{s.title}</p> : null}
              {s.items.map((it) => {
                const inner = (
                  <>
                    {it.icon ? <it.icon className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" /> : null}
                    <span className="min-w-0 flex-1">{it.label}</span>
                    {it.meta !== undefined ? <span className="text-[13px] font-semibold text-(--ap-muted) tabular-nums">{it.meta}</span> : null}
                  </>
                );
                return it.href ? (
                  <Link key={it.key} href={it.href} role="menuitem" onClick={() => setOpen(false)} className={ROW}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={it.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      it.onSelect?.();
                    }}
                    className={ROW}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          ))}
          {children ? <div className={`px-3 pt-2 pb-1 ${shown.length ? "mt-1.5 border-t border-(--ap-line-2)" : ""}`}>{children}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
