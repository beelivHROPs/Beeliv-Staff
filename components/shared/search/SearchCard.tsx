"use client";

/**
 * The one search + filter bar for lists. It is the phone search card from the Applicant jobs page
 * (components/shared/jobs/JobsExplorer.tsx) made reusable:
 *
 *   phone:   one rounded white card (52px search row + optional second row inside it),
 *            then a round 44px funnel button with a purple count badge and optional quick pills.
 *   desktop: the screen's existing look (search field + filter button in one row), unchanged.
 *
 * Typing does not search. Enter (or the keyboard Search key) searches, then the results wait behind
 * a spinner and "Searching" for SEARCH_FEEL_MS (lib/ui/search-feel.ts). Filter and sort changes settle
 * behind the same wait when the screen passes `settleKey`.
 *
 * To hide the stale results while searching, give the list's wrapper `data-search-scope`
 * (rule in search-card.css). Without it the spinner still shows, the list just stays visible.
 */
import type { ReactNode } from "react";
import { Check, Funnel, Search, X } from "@/components/applicant/icons";
import { useIsPhone } from "@/components/applicant/motion";
import { SearchField } from "@/components/client/records-filters";
import { useSettledSearch } from "./useSettledSearch";
import "./search-card.css";

/** Round 44px funnel button with a count badge (phone look). Use for screens that own their filter sheet. */
export function FunnelButton({ count = 0, onClick, expanded, controls, haspopup, className = "" }: { count?: number; onClick: () => void; expanded?: boolean; controls?: string; haspopup?: "dialog"; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count ? `Filters, ${count} applied` : "Filters"}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup={haspopup}
      title="Filters"
      className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border bg-white text-(--ap-ink) ${count ? "border-(--ap-violet)" : "border-(--ap-line)"} ${className}`}
    >
      <Funnel className="size-5" strokeWidth={1.7} aria-hidden="true" />
      {count ? <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--ap-violet) px-1 text-[12px] font-bold text-white tabular-nums">{count}</span> : null}
    </button>
  );
}

/** Quick-filter pill: "+ Label", filled with a tick when on. */
export function FilterPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white text-(--ap-ink)"}`}
    >
      {on ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : <span aria-hidden="true">+</span>}
      {children}
    </button>
  );
}

/** Spinner + "Searching" (same markup as the Applicant jobs list). */
export function SearchingStatus({ label = "Searching", className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-3 px-6 py-10 text-(--ap-muted) ${className}`}>
      <svg viewBox="0 0 24 24" className="size-8 animate-spin text-(--ap-violet) motion-reduce:animate-none" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold">{label}</span>
    </div>
  );
}

/** The phone card itself: presentational. The search runs on submit (Enter). */
export function SearchCard({
  value,
  onChange,
  onSubmit,
  onClear,
  label,
  placeholder,
  secondRow,
  filter,
  filterSlot,
  pills,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  label: string;
  placeholder: string;
  /** A control inside the card under the search row, e.g. a location select. */
  secondRow?: ReactNode;
  /** The card's own funnel button. */
  filter?: { count: number; onClick: () => void };
  /** Or a ready-made filter control (it should look like FunnelButton on phones). */
  filterSlot?: ReactNode;
  pills?: ReactNode;
}) {
  const hasFilter = Boolean(filter || filterSlot);
  return (
    <div className="flex flex-col gap-3" data-search-card="" data-has-pills={pills ? "" : undefined}>
      <form
        data-search-form=""
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
        className="rounded-[18px] border border-(--ap-line) bg-(--ap-surface) shadow-(--ap-shadow)"
      >
        <label className="flex h-[52px] items-center gap-3 px-4">
          <Search className="size-5 shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />
          <span className="sr-only">{label}</span>
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            enterKeyHint="search"
            autoComplete="off"
            className="w-full min-w-0 border-0 bg-transparent text-base text-(--ap-ink) outline-none placeholder:text-(--ap-muted) [&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <button type="button" aria-label="Clear search" onClick={() => (onClear ? onClear() : onChange(""))} className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-(--ap-muted)">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {secondRow ? <div className="border-t border-(--ap-line-2) p-1.5">{secondRow}</div> : null}
      </form>
      {hasFilter || pills ? (
        <div data-search-actions="" className={`flex items-center gap-2 py-1 ${pills ? "ap-scrollbar-none -my-1 overflow-x-auto" : ""}`}>
          {filter ? <FunnelButton count={filter.count} onClick={filter.onClick} /> : filterSlot}
          {pills}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Search bar for a list. Owns the draft text, Enter-to-search and the "Searching" wait.
 * `search.value` / `search.onChange` stay the screen's own state, so its filter logic and counts are untouched.
 */
export function SearchBar({
  search,
  settleKey,
  filter,
  filterSlot,
  secondRow,
  pills,
  hideAfter = false,
  className = "mb-3",
}: {
  search: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  /** Changes whenever a filter, sort or tab changes, so that change settles behind the same wait. */
  settleKey?: string;
  filter?: { count: number; onClick: () => void };
  filterSlot?: ReactNode;
  secondRow?: ReactNode;
  pills?: ReactNode;
  /** Hide the siblings that follow this bar (the results) while it is searching. */
  hideAfter?: boolean;
  className?: string;
}) {
  const phone = useIsPhone();
  const s = useSettledSearch({ value: search.value, onChange: search.onChange, settleKey });
  return (
    <div className={className} data-search-busy={s.busy ? "true" : undefined} data-search-after={hideAfter ? "" : undefined}>
      {phone ? (
        <SearchCard value={s.draft} onChange={s.setDraft} onSubmit={s.submit} onClear={s.clear} label={search.label} placeholder={search.placeholder} secondRow={secondRow} filter={filter} filterSlot={filterSlot} pills={pills} />
      ) : (
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            s.submit();
          }}
          className="flex items-center gap-2"
        >
          <div className="min-w-0 flex-1">
            <SearchField value={s.draft} onChange={s.setDraft} onClear={s.clear} label={search.label} placeholder={search.placeholder} />
          </div>
          {filter ? <FunnelButton count={filter.count} onClick={filter.onClick} /> : filterSlot}
        </form>
      )}
      {s.busy ? <SearchingStatus /> : null}
    </div>
  );
}
