"use client";

/**
 * ONE quiet "Filters" button for every Admin list. It carries a count of the
 * filters applied and opens a popover (desktop) or a bottom sheet (phone) that
 * holds all the secondary filters, with "Clear all" and "Show N results".
 * The search box stays visible next to it, outside the popover.
 *
 * Usage:
 *   <div className="flex items-center gap-2">
 *     <div className="min-w-0 flex-1"><SearchField .../></div>
 *     <FiltersButton active={n} resultCount={total} onClear={clear}>
 *       {({ sheet }) => (<FilterSection title="Status"><FilterField f={def} sheet={sheet} /></FilterSection>)}
 *     </FiltersButton>
 *   </div>
 *
 * Filters apply live; the popover is a plain disclosure (Escape / outside press closes it).
 */
import { useId, useState, type ReactNode } from "react";
import { ChipChoice, FilterSheet, SheetSelect, ANY, isChipControl, type FilterDef } from "@/components/admin/listKit";
import { FilterSelect } from "@/components/client/records-filters";
import { useIsPhone } from "@/components/applicant/motion";
import { Funnel } from "@/components/applicant/icons";
import { usePopover } from "./usePopover";

/**
 * A labelled block inside the Filters panel, e.g. "Status", "Period", "Client".
 * `inline` puts the title beside a single dropdown (desktop) to keep the panel short.
 */
export function FilterSection({ title, inline = false, children }: { title: string; inline?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={`min-w-0 border-t border-(--ap-line-2) py-3 first:border-t-0 first:pt-0 last:pb-0 ${inline ? "min-[768px]:grid min-[768px]:grid-cols-[88px_minmax(0,1fr)] min-[768px]:items-center min-[768px]:gap-3" : ""}`}>
      <h3 id={id} className={`m-0 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase ${inline ? "mb-2 min-[768px]:mb-0" : "mb-2"}`}>
        {title}
      </h3>
      <div className="flex min-w-0 flex-col gap-2.5">{children}</div>
    </div>
  );
}

/** One filter: tap-to-select chips when it has 6 or fewer choices, otherwise a dropdown. `label` shows a small name above the control. */
export function FilterField({ f, sheet, label = false }: { f: FilterDef; sheet: boolean; label?: boolean }) {
  const chips = isChipControl(f);
  return (
    <div className="min-w-0">
      {label ? <div className="mb-1.5 text-[13px] font-semibold text-(--ap-ink-2)">{f.label}</div> : null}
      {chips ? <ChipChoice f={f} /> : sheet ? <SheetSelect f={f} /> : <FilterSelect label={f.label} value={f.value || ANY} onChange={f.onChange} options={f.options} />}
    </div>
  );
}

export function FiltersButton({
  active,
  resultCount,
  onClear,
  children,
}: {
  /** How many filters are applied (a sort never counts). */
  active: number;
  /** Live result count for "Show N results". */
  resultCount?: number;
  onClear?: () => void;
  children: ReactNode | ((ctx: { sheet: boolean }) => ReactNode);
}) {
  const { open, setOpen, wrap, trigger } = usePopover();
  const phone = useIsPhone();
  // The sheet manages its own Escape and scroll lock; the desktop popover uses the hook above.
  const [sheetOpen, setSheetOpen] = useState(false);
  const id = useId();
  const isOpen = phone ? sheetOpen : open;
  const render = (sheet: boolean) => (typeof children === "function" ? children({ sheet }) : children);
  const showLabel = resultCount === undefined ? "Show results" : resultCount === 0 ? "No results" : `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`;
  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        aria-haspopup="dialog"
        aria-label={active > 0 ? `Filters, ${active} applied` : "Filters"}
        title="Filters"
        onClick={() => (phone ? setSheetOpen((o) => !o) : setOpen(!open))}
        className={`ap-hit relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none max-[767px]:size-11 max-[767px]:bg-white max-[767px]:px-0 max-[767px]:text-(--ap-ink) ${isOpen || active ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
      >
        <Funnel className="size-[18px] max-[767px]:size-5" strokeWidth={1.7} aria-hidden="true" />
        {active > 0 ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-(--ap-violet) px-1.5 text-[11px] leading-5 font-bold text-white tabular-nums max-[767px]:absolute max-[767px]:-top-1 max-[767px]:-right-1 max-[767px]:h-[18px] max-[767px]:min-w-[18px] max-[767px]:px-1 max-[767px]:text-[12px] max-[767px]:leading-none">{active}</span> : null}
      </button>
      {!phone && open ? (
        <div id={id} role="dialog" aria-label="Filters" className="ap-pop-in absolute top-[calc(100%+8px)] right-0 z-[150] w-[min(440px,calc(100vw-32px))] rounded-2xl border border-(--ap-line) bg-(--ap-surface) shadow-(--ap-shadow)">
          <div className="max-h-[min(62dvh,540px)] overflow-y-auto overscroll-contain p-4">{render(false)}</div>
          <div className="flex items-center justify-between gap-2 border-t border-(--ap-line-2) px-4 py-3">
            {onClear ? (
              <button type="button" disabled={active === 0} onClick={onClear} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2) disabled:cursor-not-allowed disabled:opacity-40">
                Clear all
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => setOpen(false)} className="ap-btn ap-btn-p ap-btn-sm h-9 text-white!">
              {showLabel}
            </button>
          </div>
        </div>
      ) : null}
      {phone ? (
        <FilterSheet open={sheetOpen} id={id} active={active} resultCount={resultCount} onClear={onClear} clearLabel="Clear all" onClose={() => setSheetOpen(false)}>
          {render(true)}
        </FilterSheet>
      ) : null}
    </div>
  );
}
