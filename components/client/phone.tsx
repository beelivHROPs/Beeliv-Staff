"use client";

/**
 * Phone-only building blocks for the calm Client look (390px-wide first). Phone
 * and desktop are different layouts, not one shrunk: on phones the Client app
 * uses ONE column, one primary action per screen (the rest sit under "More"),
 * compact rows, search + a single Filters button that opens a bottom sheet, and
 * chip rows that scroll sideways instead of wrapping.
 *
 * Presentation only: every consumer still passes its own data and handlers.
 * The filter sheet mirrors the pattern in components/admin/listKit.tsx
 * (SearchFilterBar) but is rebuilt here with Client tokens, because that file's
 * sheet is wrapped in the Admin theme and is not importable as-is.
 */
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, X } from "@/components/applicant/icons";
import { SwipeSheet, useIsClient } from "@/components/applicant/motion";
import { CLIENT_THEME } from "./ClientShell";
import { Ellipsis } from "./icons";
import { FunnelButton, SearchBar } from "@/components/shared/search/SearchCard";

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function PhoneSheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const isClient = useIsClient();
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="phone-sheet"
          className={`${CLIENT_THEME} fixed inset-0 z-[110] flex items-end min-[768px]:hidden`}
          style={{ background: "rgba(20,12,16,.45)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <SwipeSheet
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClose={onClose}
            className="cc-sheet max-h-[88dvh] overflow-y-auto overscroll-contain px-4"
            header={
              <div className="mt-2 mb-2 flex items-center justify-between gap-3">
                <b id={titleId} className="text-[17px] font-bold text-(--ap-ink)">
                  {title}
                </b>
                <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full text-(--ap-ink-2) hover:bg-(--ap-line-2)">
                  <X className="size-[18px]" aria-hidden="true" />
                </button>
              </div>
            }
          >
            <div className="pb-4">{children}</div>
            {footer ? <div className="cc-sheet sticky bottom-0 z-10 -mx-4 flex items-center gap-2.5 border-t border-(--ap-line-2) px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">{footer}</div> : null}
          </SwipeSheet>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

const CHIP = "ap-hit inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors";
const CHIP_ON = "border-(--ap-violet) bg-(--ap-violet) text-white";
const CHIP_OFF = "border-(--ap-line) text-(--ap-ink-2)";

export function Chip({ on, onClick, count, children }: { on: boolean; onClick: () => void; count?: number; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
      {children}
      {count !== undefined ? <span className="tabular-nums opacity-80">{count}</span> : null}
    </button>
  );
}

/** One row of chips that scrolls sideways (never wraps). It bleeds to the screen edge on phones. */
export function ChipRow({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`ap-scrollbar-none -mx-[18px] flex flex-nowrap gap-2 overflow-x-auto px-[18px] py-0.5 max-[380px]:-mx-3.5 max-[380px]:px-3.5 ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Search + one Filters button -> bottom sheet                         */
/* ------------------------------------------------------------------ */

export interface PhoneFilterGroup {
  key: string;
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

/** The sheet shows this many groups; the rest fold under "More filters". */
const VISIBLE_GROUPS = 4;

export function PhoneFilterBar({
  search,
  groups,
  active,
  resultCount,
  onReset,
  lead,
}: {
  /** Short text on the left when there is no search field (for example the period), so the Filters button never sits alone. */
  lead?: React.ReactNode;
  search?: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  groups: PhoneFilterGroup[];
  /** How many filters are applied (shown on the button). */
  active: number;
  /** Live number of matches for the sheet's primary button; omit to show "Done". */
  resultCount?: number;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  // Applied filters = groups not on their first (default) option, shown as removable pills next to the funnel.
  const applied = groups.filter((g) => g.options.length > 0 && g.value !== g.options[0].value);
  const pills = applied.length ? (
    <>
      {applied.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => g.onChange(g.options[0].value)}
          aria-label={`Remove filter ${g.title}`}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-(--ap-tint) pr-3 pl-4 text-[15px] font-semibold whitespace-nowrap text-(--ap-violet)"
        >
          {g.options.find((o) => o.value === g.value)?.label ?? g.title}
          <X className="size-4" aria-hidden="true" />
        </button>
      ))}
    </>
  ) : undefined;
  const funnel = groups.length ? <FunnelButton count={active} onClick={() => setOpen(true)} haspopup="dialog" /> : null;
  const sheet = (
    <>
      <PhoneSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <>
            <button type="button" disabled={active === 0} onClick={onReset} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-[14px] font-semibold text-(--ap-ink-2) disabled:cursor-not-allowed disabled:opacity-40">
              Reset
            </button>
            <button type="button" onClick={() => setOpen(false)} className="ap-btn ap-btn-p min-h-11 flex-1 text-white!">
              {resultCount === undefined ? "Done" : resultCount === 0 ? "No results" : `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {(more ? groups : groups.slice(0, VISIBLE_GROUPS)).map((g) => (
            <fieldset key={g.key} className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 p-0 text-[17px] font-bold text-(--ap-ink)">{g.title}</legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <Chip key={o.value} on={g.value === o.value} onClick={() => g.onChange(o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ))}
          {!more && groups.length > VISIBLE_GROUPS ? (
            <button type="button" onClick={() => setMore(true)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--ap-line) text-[15px] font-semibold text-(--ap-ink)">
              More filters
            </button>
          ) : null}
        </div>
      </PhoneSheet>
    </>
  );
  const slot = (
    <>
      {funnel}
      {sheet}
    </>
  );
  if (search) {
    return <SearchBar hideAfter className="mb-3 min-[768px]:hidden" search={search} settleKey={groups.map((g) => g.value).join("|")} filterSlot={slot} pills={pills} />;
  }
  return (
    <div className="mb-3 flex items-center gap-2 min-[768px]:hidden">
      <span className="min-w-0 flex-1 text-[13px] text-(--ap-muted)">{lead}</span>
      {slot}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "More" menu: the screen's secondary actions in a bottom sheet        */
/* ------------------------------------------------------------------ */

export interface MoreAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

/** Phone-only "..." button. Each screen shows ONE primary action; everything else lives here. */
export function MoreActions({ title = "More", actions }: { title?: string; actions: MoreAction[] }) {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <span className="min-[768px]:hidden">
      <button type="button" aria-label={title} aria-haspopup="dialog" onClick={() => setOpen(true)} className="ap-hit inline-flex size-11 items-center justify-center rounded-full border border-(--ap-line) text-(--ap-ink-2)">
        <Ellipsis className="size-5" aria-hidden="true" />
      </button>
      <PhoneSheet open={open} onClose={() => setOpen(false)} title={title}>
        <ul className="m-0 flex list-none flex-col p-0">
          {actions.map((a) => {
            const cls = "flex min-h-14 w-full items-center gap-3 border-t border-(--ap-line-2) text-left text-[15px] font-semibold text-(--ap-ink) first:border-t-0";
            return (
              <li key={a.label}>
                {a.href ? (
                  <Link href={a.href} onClick={() => setOpen(false)} className={cls}>
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className="size-4 text-(--ap-faint)" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      a.onClick?.();
                    }}
                    className={cls}
                  >
                    <span className="flex-1">{a.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </PhoneSheet>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared class strings                                          */
/* ------------------------------------------------------------------ */

/**
 * Phone loading skeleton matching the new Client phone pages: eyebrow + title lines, an optional plum hero block,
 * an optional row of tiles, then separate 20px cards. Phone only (min-[768px]:hidden); pages keep their desktop skeleton.
 */
export function PhoneSkeleton({ label, hero = true, tiles = 0, cards = 4, header = true }: { label: string; hero?: boolean; tiles?: 2 | 4 | 0; cards?: number; header?: boolean }) {
  const sk = "ap-shimmer";
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-5 min-[768px]:hidden">
      {header ? (
        <div>
          <div className={`${sk} h-3 w-28 rounded-full`} />
          <div className={`${sk} mt-2.5 h-8 w-44 rounded-xl`} />
          <div className={`${sk} mt-3 h-4 w-56 max-w-full rounded-full`} />
        </div>
      ) : null}
      {hero ? <div className={`${sk} h-[148px] rounded-[26px]`} /> : null}
      {tiles ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className={`${sk} h-[92px] rounded-[20px]`} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className={`${sk} h-[68px] rounded-[20px]`} />
        ))}
      </div>
    </div>
  );
}

/** A 56px list row on phones, hairline-divided. */
export const PHONE_ROW = "flex min-h-14 items-center gap-3 border-t border-(--ap-line-2) py-2 first:border-t-0";
