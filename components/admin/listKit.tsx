"use client";

/**
 * Shared layout for every Admin list. It copies the Client app's list pattern
 * (components/client/workforce/WorkforceBody.tsx) so the two apps feel the same:
 *
 *   PageHeading (primary actions at the right of the title row, no subtitle)
 *   ONE section card (radius 20px, padding 20px):
 *     card heading (17px bold) + a muted one-line summary
 *     pill tabs with counts (outlined; active = filled brand)
 *     full-width search
 *     a row of selects (3 across, equal width), the Sort select last
 *     table (12px uppercase muted headers, ~55px rows, chevron at the end)
 *     "Showing n of m" + Show more, inside the card
 *
 * Reference screens: Client My Workforce / Recruitment.
 */
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { Check, ChevronDown, Funnel, Search, X } from "@/components/applicant/icons";
import { SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { FilterSelect } from "@/components/client/records-filters";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import type { SortOption } from "@/lib/admin/sort";

export const ANY = "__any";

/* ---------- shared class names (tables, cards, empty states) ---------- */

/** Table header cells: 12px uppercase muted. */
export const TH = "text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase";
/** Tables sit inside the section card, so the wrapper itself is plain. */
export const TABLE_CARD = "";
export const HEAD_ROW = "px-2 pb-2";
export const BODY_ROW = "ad-clickrow min-h-[56px]border-t border-(--ap-line-2) px-2 py-2 hover:bg-(--ap-tint-soft)";
/** Stacked rows on narrow containers: dividers inside the card, no nested cards. */
export const CARD_LIST = "m-0 flex list-none flex-col p-0 max-[767px]:gap-2.5";
/** Phones: every item is its own pure white card (24px radius, soft shadow, 16px padding, no border). Wider screens keep hairline-divided rows. */
export const CARD_ITEM = "ad-clickrow ad-card ad-itemcard min-[768px]:border-t min-[768px]:border-(--ap-line-2) min-[768px]:py-3 min-[768px]:first:border-t-0 max-[767px]:rounded-3xl max-[767px]:bg-(--ap-surface) max-[767px]:p-4 max-[767px]:shadow-[0_8px_24px_rgba(60,30,80,.07)] max-[767px]:active:bg-(--ap-tint-soft)";
/** Phones, tiny uniform rows only (e.g. an attendance log): ONE white card with hairline separators. */
export const GROUP_LIST = "m-0 flex list-none flex-col p-0 max-[767px]:rounded-3xl max-[767px]:bg-(--ap-surface) max-[767px]:px-4 max-[767px]:py-1 max-[767px]:shadow-[0_8px_24px_rgba(60,30,80,.07)]";
export const GROUP_ITEM = "ad-clickrow ad-card ad-itemcard min-[768px]:border-t min-[768px]:border-(--ap-line-2) min-[768px]:py-3 min-[768px]:first:border-t-0 max-[767px]:border-t max-[767px]:border-(--ap-line-2) max-[767px]:py-3 max-[767px]:first:border-t-0";
export const EMPTY_CARD = "ap-card rounded-[20px] p-6 max-[767px]:p-4 min-[768px]:p-8";

/** Phones: a detail page's main actions become a fixed bottom bar (pair with <span data-admin-detail hidden /> so the tab bar steps aside; rule in app/admin/admin.css). Do not put it inside a container-type ancestor. */
export const STICKY_BAR = "max-[767px]:fixed max-[767px]:inset-x-0 max-[767px]:bottom-0 max-[767px]:z-40 max-[767px]:flex max-[767px]:flex-row! max-[767px]:flex-nowrap max-[767px]:items-center max-[767px]:gap-2.5 max-[767px]:border-t max-[767px]:border-(--ap-line) max-[767px]:bg-(--ap-surface) max-[767px]:px-4 max-[767px]:pt-3 max-[767px]:pb-[calc(12px+env(safe-area-inset-bottom,0px))] max-[767px]:[&>a]:flex-1 max-[767px]:[&>button]:flex-1";

/** Legacy toolbar class names, kept until the last consumer is migrated. */
export const TOOLBAR = "mb-3 flex flex-col gap-3 min-[1280px]:flex-row min-[1280px]:items-center";
export const SEARCH_COL = "min-[1280px]:w-[320px] min-[1280px]:shrink-0";
export const FILTER_GRID = "grid min-w-0 flex-1 grid-cols-2 gap-3";

/**
 * Show-more batches. The visible count resets to the first batch whenever
 * `resetKey` (a string encoding search, filters, tab and sort) changes, with no effect needed.
 */
export function useBatch(resetKey: string) {
  // Phones start with a short list (5) and add 5 at a time; desktop keeps 10.
  const step = useIsPhone() ? 5 : SHOW_MORE_STEP;
  const [state, setState] = useState({ key: resetKey, extra: 0 });
  const extra = state.key === resetKey ? state.extra : 0;
  const limit = step + extra;
  const more = () => setState({ key: resetKey, extra: extra + step });
  return { limit, more };
}

/* ---------- the section card ---------- */

export function ListCard({ title, summary, showTitle = false, flat = false, children }: { title: string; summary?: string; /** Only for cards that are NOT the page's main list (the page title already names it). */ showTitle?: boolean; /** Desktop and tablet only: no outer card and no count line (the pill row carries the count); the table is its own white card. Phones unchanged. */ flat?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} data-search-scope className={`ap-card min-w-0 rounded-[20px] p-4.5 max-[767px]:flex max-[767px]:flex-col max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:flex min-[768px]:flex-col ${flat ? "min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none min-[768px]:[&_[data-list-tabs]>div]:mb-6" : "min-[768px]:rounded-xl min-[768px]:p-4 min-[1100px]:p-5"}`}>
      {/* Phones: no big card. The toolbar frame (order -1) comes first, then this small count heading, then the list's own frame. */}
      <div className={`mb-4 max-[767px]:mt-4 max-[767px]:mb-2 max-[767px]:px-1 min-[768px]:order-[-2] ${flat && !showTitle ? "min-[768px]:hidden" : ""}`}>
        {showTitle ? <h2 className="text-[17px] leading-tight font-bold text-(--ap-ink)">{title}</h2> : null}
        {summary ? <p className={`${showTitle ? "mt-0.5" : ""} text-[13px] text-(--ap-muted) max-[767px]:text-[17px] max-[767px]:font-bold max-[767px]:text-(--ap-ink)`}>{summary}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ---------- Tabs: outlined pills with counts, active = filled brand ---------- */

export interface ListTab<K extends string> {
  key: K;
  label: string;
  count?: number;
}

export function ListTabs<K extends string>({ label, tabs, value, onChange }: { label: string; tabs: ListTab<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div role="group" aria-label={label} className="ap-scrollbar-none mb-3 flex flex-wrap gap-2 min-[768px]:mb-4 min-[768px]:gap-x-2 min-[768px]:gap-y-2 max-[767px]:-mx-3 max-[767px]:mb-3 max-[767px]:flex-nowrap max-[767px]:gap-1.5 max-[767px]:overflow-x-auto max-[767px]:scroll-px-3 max-[767px]:px-3 max-[767px]:[mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-28px),transparent)]">
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.key)}
            className={`ap-hit inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors min-[768px]:h-9 min-[768px]:px-4 min-[768px]:py-0 max-[767px]:min-h-10 max-[767px]:border-0 max-[767px]:px-4 max-[767px]:py-1 max-[767px]:text-[14px] max-[767px]:font-bold ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white ad-grad max-[767px]:shadow-[0_8px_18px_rgba(139,34,82,.28)]" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2) max-[767px]:bg-(--ap-surface) max-[767px]:shadow-[0_4px_12px_rgba(60,30,80,.06)]"}`}
          >
            {t.label}
            {t.count !== undefined ? <span className="tabular-nums">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Phones: a hub page (e.g. People) owns the main-scope tab row, but the lists it embeds own the
 * search card. The hub provides its phone tab row here and each list drops it in right UNDER its
 * search card, so the order is always: search, then the one tab row.
 */
const PhoneScopeCtx = createContext<ReactNode>(null);
export const PhoneScopeProvider = PhoneScopeCtx.Provider;
export function PhoneScopeSlot() {
  const node = useContext(PhoneScopeCtx);
  return node ? <div className="mt-3 min-[768px]:hidden [&>div]:mb-0">{node}</div> : null;
}

/**
 * Desktop and tablet twin of the phone scope slot: a hub (People) provides its ONE pill row here, and each
 * embedded list shows it under its search field INSTEAD of its own pill row (`useDeskScope()` is null on a standalone page).
 */
const DeskScopeCtx = createContext<ReactNode>(null);
export const DeskScopeProvider = DeskScopeCtx.Provider;
export function useDeskScope() {
  return useContext(DeskScopeCtx);
}

/* ---------- Toolbar: search, grouped filters, active-filter chips ---------- */

export interface FilterDef {
  key: string;
  label: string;
  /** Current value; "" is shown as "any". */
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  /** Force a control. Default: tap-to-select chips when there are 6 or fewer real options, otherwise a dropdown. */
  control?: "chips" | "select";
  /** Label of the "no filter" choice when shown as a chip (default "Any"). */
  anyLabel?: string;
}

/** A short labelled heading over one or more related filters, e.g. "Status", "Who / Where", "Dates". */
export interface FilterGroup {
  key: string;
  title: string;
  filters: FilterDef[];
}

/** One applied filter, shown as a removable chip. */
export interface ActiveChip {
  key: string;
  label: string;
  text: string;
  onRemove: () => void;
}

const CHIP_MAX = 6;
const isAny = (v: string) => !v || v === ANY;
const realOptions = (f: FilterDef) => f.options.filter((o) => !isAny(o.value));
export const isChipControl = (f: FilterDef) => (f.control ? f.control === "chips" : realOptions(f).length <= CHIP_MAX);

/** Removable chips for every filter that is not "any". */
export function activeFilterChips(filters: FilterDef[]): ActiveChip[] {
  return filters
    .filter((f) => !isAny(f.value))
    .map((f) => ({ key: f.key, label: f.label, text: f.options.find((o) => o.value === f.value)?.label ?? f.value, onRemove: () => f.onChange(ANY) }));
}

const GROUP_TITLE = "text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase";

/** Tap-to-select choices: one pill per option, the chosen one filled. 44px tall on phones. */
export function ChipChoice({ f }: { f: FilterDef }) {
  const opts = f.options.map((o) => (isAny(o.value) ? { value: ANY, label: f.anyLabel ?? "Any" } : o));
  const current = isAny(f.value) ? ANY : f.value;
  return (
    <div role="group" aria-label={f.label} className="flex flex-wrap gap-2">
      {opts.map((o) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => f.onChange(o.value)}
            className={`inline-flex max-w-full items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors max-[767px]:min-h-10 max-[767px]:border-0 max-[767px]:px-4 max-[767px]:text-[14px] max-[767px]:font-bold min-[768px]:h-8 min-[768px]:px-3 ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white ad-grad" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2) max-[767px]:bg-(--ap-tint-soft)"}`}
          >
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Long lists on a phone. A floating menu would be clipped by the scrolling sheet, so the
 * choices open in the page flow right under the button instead, and the sheet scrolls.
 */
export function SheetSelect({ f }: { f: FilterDef }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const value = f.value || ANY;
  const opts = f.options;
  const current = opts.find((o) => o.value === value) ?? opts[0];
  return (
    <div className="w-full">
      <button
        type="button"
        role="combobox"
        aria-label={f.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-white pr-3 pl-3.5 text-left text-[15px] font-semibold text-(--ap-ink) outline-none ${open ? "border-(--ap-violet)" : "border-(--ap-line)"}`}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label}</span>
        <ChevronDown className={`size-4 shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul id={listId} role="listbox" aria-label={f.label} className="m-0 mt-1.5 max-h-[40dvh] list-none overflow-y-auto overscroll-contain rounded-2xl border border-(--ap-line) p-1.5">
          {opts.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    f.onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[15px] ${on ? "bg-(--ap-tint) font-bold text-(--ap-violet)" : "font-semibold text-(--ap-ink-2)"}`}
                >
                  <span className="flex-1">{o.label}</span>
                  <Check className={`size-4 shrink-0 ${on ? "opacity-100" : "opacity-0"}`} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function FilterControl({ f, showLabel, sheet }: { f: FilterDef; showLabel: boolean; sheet: boolean }) {
  const chips = isChipControl(f);
  return (
    <div className={`min-w-0 ${chips ? "" : "w-full min-[768px]:w-[220px]"}`}>
      {showLabel ? <div className="mb-1.5 text-[13px] font-semibold text-(--ap-ink-2)">{f.label}</div> : null}
      {chips ? <ChipChoice f={f} /> : sheet ? <SheetSelect f={f} /> : <FilterSelect label={f.label} value={f.value || ANY} onChange={f.onChange} options={f.options} />}
    </div>
  );
}

/** One heading plus its controls. A filter repeats its own label only when the heading does not already say it. */
function GroupBody({ g, sheet }: { g: FilterGroup; sheet: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-3">
      {g.filters.map((f) => (
        <FilterControl key={f.key} f={f} sheet={sheet} showLabel={g.filters.length > 1 || f.label.toLowerCase() !== g.title.toLowerCase()} />
      ))}
    </div>
  );
}

/** Sort is never "applied": it always has a value, so it does not count. */
const groupActive = (g: FilterGroup) => (g.key === "sort" ? 0 : g.filters.filter((f) => !isAny(f.value)).length);

function GroupSection({ g, sheet }: { g: FilterGroup; sheet: boolean }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      {g.title ? <legend className={`${GROUP_TITLE} mb-2 p-0`}>{g.title}</legend> : null}
      <GroupBody g={g} sheet={sheet} />
    </fieldset>
  );
}

/**
 * Desktop panel content: a calm, dense grid. One row per filter: group heading at the
 * left (once per group), the filter's name, then its choices. Groups are divided by a hairline.
 */
function PanelGroups({ groups }: { groups: FilterGroup[] }) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.title || "Filters"} className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-(--ap-line-2) py-2.5 first:border-t-0 first:pt-0 last:pb-0 min-[900px]:grid-cols-[120px_minmax(0,1fr)]">
          <h3 className={`${GROUP_TITLE} m-0 min-[900px]:pt-2`}>{g.title}</h3>
          <div className="flex min-w-0 flex-col gap-2">
            {g.filters.map((f) => {
              const named = f.label.toLowerCase() !== g.title.toLowerCase();
              return (
                <div key={f.key} className={`grid min-w-0 items-center gap-x-3 gap-y-1 ${named ? "min-[1100px]:grid-cols-[96px_minmax(0,1fr)]" : ""}`}>
                  {named ? <span className="text-[13px] font-semibold text-(--ap-ink-2)">{f.label}</span> : null}
                  <div className="min-w-0">{isChipControl(f) ? <ChipChoice f={f} /> : <div className="w-[240px] max-w-full [&_[role=combobox]]:text-left"><FilterSelect label={f.label} value={f.value || ANY} onChange={f.onChange} options={f.options} /></div>}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Phone sheet content: groups stacked; folds them only when there are more than 3. */
function SheetGroups({ groups }: { groups: FilterGroup[] }) {
  // At most 3 groups show; the rest sit behind "More filters" (open already if one of them is applied).
  const shown = groups.slice(0, 3);
  const rest = groups.slice(3);
  const [more, setMore] = useState(() => rest.some((g) => groupActive(g) > 0));
  const moreId = useId();
  return (
    <div className="flex flex-col gap-5">
      {shown.map((g) => (
        <GroupSection key={g.key} g={g} sheet />
      ))}
      {rest.length > 0 ? (
        <div className="border-t border-(--ap-line-2)">
          <button type="button" aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)} className="flex min-h-12 w-full items-center justify-between text-left text-[15px] font-bold text-(--ap-ink)">
            More filters
            <ChevronDown className={`size-5 text-(--ap-muted) transition-transform ${more ? "rotate-180" : "-rotate-90"}`} aria-hidden="true" />
          </button>
          <div id={moreId} hidden={!more} className="flex flex-col gap-5 pt-1 pb-2">
            {rest.map((g) => (
              <GroupSection key={g.key} g={g} sheet />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One row of removable chips ("Client: Acme x") with a single "Clear all". Renders nothing when nothing is applied. */
export function ActiveChips({ chips, onClearAll, className = "" }: { chips: ActiveChip[]; onClearAll?: () => void; className?: string }) {
  if (chips.length === 0) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ul aria-label="Applied filters" className="ap-scrollbar-none m-0 flex min-w-0 flex-1 list-none items-center gap-2 overflow-x-auto p-0 min-[768px]:flex-wrap min-[768px]:overflow-visible">
        {chips.map((c) => (
          <li key={c.key} className="shrink-0">
            <button
              type="button"
              onClick={c.onRemove}
              aria-label={`Remove filter ${c.label}: ${c.text}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--ap-tint) pr-2.5 pl-3 text-[13px] font-semibold text-(--ap-violet) transition-colors hover:bg-(--ap-line) max-[767px]:min-h-11 min-[768px]:h-8"
            >
              <span className="max-w-[260px] truncate">
                <span className="font-medium opacity-80">{c.label}:</span> {c.text}
              </span>
              <X className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {onClearAll && chips.length > 0 ? (
        <button type="button" onClick={onClearAll} className="inline-flex shrink-0 items-center rounded-full px-2.5 text-[13px] font-semibold text-(--ap-ink-2) underline-offset-2 hover:underline max-[767px]:min-h-11 min-[768px]:h-8">
          Clear all
        </button>
      ) : null}
    </div>
  );
}

/**
 * Search box with one closed "Filters" button beside it. On desktop the controls
 * (children) open in a calm inline panel; on phones the same controls open in a
 * bottom sheet with a sticky "Show n results" button and a quiet Reset. Whatever is
 * applied always shows underneath as removable chips. Filters apply live.
 *
 * `children` may be a function so the phone sheet can fold groups differently.
 * `onClear` (optional) resets the filters; without it there is no Reset / Clear all.
 */
export function SearchFilterBar({
  search,
  active,
  hasPanel = true,
  onClear,
  chips = [],
  resultCount,
  settleKey,
  children,
}: {
  search: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  active: number;
  hasPanel?: boolean;
  onClear?: () => void;
  chips?: ActiveChip[];
  /** Live number of results, shown on the phone sheet's primary button. */
  resultCount?: number;
  /** Changes when a filter, sort or tab changes, so it settles behind the same "Searching" wait as a search. */
  settleKey?: string;
  children?: ReactNode | ((ctx: { sheet: boolean }) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const phone = useIsPhone();
  const panelId = useId();
  const render = (sheet: boolean) => (typeof children === "function" ? children({ sheet }) : children);
  return (
    <div className="mb-3 flex flex-col gap-2.5 max-[767px]:mb-0 min-[768px]:order-[-1]">
      <SearchBar
        search={search}
        settleKey={settleKey}
        className=""
        filterSlot={
          hasPanel ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup={phone ? "dialog" : undefined}
              aria-label={active > 0 ? `Filters, ${active} applied` : "Filters"}
              title="Filters"
              onClick={() => setOpen((o) => !o)}
              className={`ap-hit relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors max-[767px]:size-11 max-[767px]:bg-white max-[767px]:px-0 max-[767px]:text-(--ap-ink) ${open || active ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
            >
              <Funnel className="size-[18px] max-[767px]:size-5" strokeWidth={1.7} aria-hidden="true" />
              {active > 0 ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-(--ap-violet) px-1.5 text-[11px] leading-5 font-bold text-white tabular-nums max-[767px]:absolute max-[767px]:-top-1 max-[767px]:-right-1 max-[767px]:h-[18px] max-[767px]:min-w-[18px] max-[767px]:px-1 max-[767px]:text-[12px] max-[767px]:leading-none">{active}</span> : null}
            </button>
          ) : undefined
        }
      />
      {hasPanel && open && !phone ? (
        <div id={panelId} className="rounded-2xl border border-(--ap-line-2) p-4">
          {render(false)}
        </div>
      ) : null}
      <ActiveChips chips={chips} onClearAll={onClear} />
      {hasPanel && phone ? (
        <FilterSheet open={open} id={panelId} active={active} resultCount={resultCount} onClear={onClear} onClose={() => setOpen(false)}>
          {render(true)}
        </FilterSheet>
      ) : null}
    </div>
  );
}

/** Phone filter bottom sheet: grouped controls, with the primary "Show n results" button and a quiet Reset pinned at the bottom. */
export function FilterSheet({ open, id, active, resultCount, onClear, onClose, children, clearLabel = "Reset" }: { open: boolean; id: string; active: number; resultCount?: number; onClear?: () => void; onClose: () => void; children: ReactNode; clearLabel?: string }) {
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
  const showLabel = resultCount === undefined ? "Show results" : resultCount === 0 ? "No results" : `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="filters"
          className={`${ADMIN_THEME} fixed inset-0 z-[110] flex items-end min-[768px]:hidden`}
          style={{ background: "rgba(25,12,20,.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <SwipeSheet
            id={id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClose={onClose}
            className="max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[30px]! px-[18px]"
            header={
              <div className="mt-3.5 mb-1 flex items-center justify-between gap-3">
                <b id={titleId} className="block text-[21px] leading-tight font-bold">
                  Filters{active > 0 ? <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-(--ap-violet) px-1.5 align-middle text-[12px] leading-6 font-bold text-white tabular-nums">{active}</span> : null}
                </b>
                {onClear ? (
                  <button type="button" disabled={active === 0} onClick={onClear} aria-label={`${clearLabel} filters`} className="inline-flex min-h-11 items-center px-1 text-[15px] font-bold text-(--ap-violet) disabled:cursor-not-allowed disabled:opacity-40">
                    Reset
                  </button>
                ) : (
                  <button type="button" onClick={onClose} aria-label="Close filters" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-ink-2)">
                    <X className="size-[18px]" aria-hidden="true" />
                  </button>
                )}
              </div>
            }
          >
            <div className="pt-1 pb-6">{children}</div>
            <div className="sticky bottom-0 z-10 -mx-[18px] flex items-center gap-2.5 bg-(--ap-surface) px-[18px] pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
              <button type="button" onClick={onClose} className="inline-flex h-14 flex-1 items-center justify-center rounded-full ad-grad text-[16px] font-bold text-white shadow-[0_12px_24px_rgba(139,34,82,.32)]">
                {showLabel}
              </button>
            </div>
          </SwipeSheet>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * The standard list toolbar. Pass `groups` for labelled sections (Status, Who / Where,
 * Dates...) or the older flat `filters` (shown as one unheaded group). Sort is always
 * its own "Sort" group last.
 */
export function ListToolbar<K extends string>({
  tabsLabel,
  tabs,
  tab,
  onTab,
  sort,
  search,
  filters = [],
  groups,
  before,
  onClearFilters,
  resultCount,
  tabChipLabel,
  phoneTop,
  tabsInSheet = false,
  tabsTitle = "Status",
}: {
  /** Phones only: the tab row is replaced by a "Status" group inside the filter sheet (plus one removable pill). Use when ANOTHER scope row already sits on the page. Desktop keeps the tab row. */
  tabsInSheet?: boolean;
  tabsTitle?: string;
  /** Phones only: the list's hero card and/or count cards, shown between the search row and the status pills. */
  phoneTop?: ReactNode;
  tabsLabel: string;
  tabs?: ListTab<K>[];
  tab?: K;
  onTab?: (k: K) => void;
  sort: { value: string; options: SortOption[]; onChange: (v: string) => void } | null;
  search: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  filters?: FilterDef[];
  /** Grouped filters. When given, `filters` is ignored. */
  groups?: FilterGroup[];
  /** Extra control above the tabs (e.g. a List / Week switch). */
  before?: ReactNode;
  /** Resets every filter at once (Reset / Clear all). Default: clears each in turn, which is safe for URL-backed filters. */
  onClearFilters?: () => void;
  /** Live result count for the phone sheet's "Show n results" button. */
  resultCount?: number;
  /** When set, a tab other than the first is also shown as a removable chip, e.g. "Stage: Shortlisted". */
  tabChipLabel?: string;
}) {
  const baseGroups: FilterGroup[] = groups ?? (filters.length ? [{ key: "filters", title: "", filters }] : []);
  const all = baseGroups.flatMap((g) => g.filters);
  const sortGroup: FilterGroup | null = sort && sort.options.length > 1 ? { key: "sort", title: "Sort", filters: [{ key: "sort", label: "Sort", value: sort.value, options: sort.options, onChange: sort.onChange }] } : null;
  const shownGroups = sortGroup ? [...baseGroups, sortGroup] : baseGroups;
  const phone = useIsPhone();
  const first = tabs?.[0]?.key;
  const tabNow = tabs?.find((t) => t.key === tab);
  const inSheet = tabsInSheet && phone && !!tabs && !!onTab && tab !== undefined && first !== undefined;
  const tabFilter: FilterDef | null = inSheet && tabs && first !== undefined ? { key: "__tab", label: tabsTitle, control: "chips", value: tab === first ? ANY : (tab as string), anyLabel: `${tabs[0].label}${tabs[0].count !== undefined ? ` ${tabs[0].count}` : ""}`, options: tabs.map((t, i) => ({ value: i === 0 ? ANY : t.key, label: `${t.label}${t.count !== undefined ? ` ${t.count}` : ""}` })), onChange: (v) => onTab?.(v === ANY ? first : (v as K)) } : null;
  const sheetGroups: FilterGroup[] = tabFilter ? [{ key: "__tabs", title: tabsTitle, filters: [tabFilter] }, ...shownGroups] : shownGroups;
  const active = all.filter((f) => !isAny(f.value)).length + (tabFilter && !isAny(tabFilter.value) ? 1 : 0);
  const hasPanel = sheetGroups.length > 0;

  const chips = activeFilterChips(all);
  const chipLabel = tabChipLabel ?? (inSheet ? tabsTitle : undefined);
  if (chipLabel && tabs && tabNow && onTab && first !== undefined && tab !== first) chips.unshift({ key: "__tab", label: chipLabel, text: tabNow.label, onRemove: () => onTab(first) });

  const clearBase = onClearFilters ?? (() => all.filter((f) => !isAny(f.value)).forEach((f, i) => window.setTimeout(() => f.onChange(ANY), i * 80)));
  const clear = () => {
    clearBase();
    if (inSheet && onTab && first !== undefined) onTab(first);
  };
  return (
    <div className="contents max-[767px]:order-[-1] max-[767px]:flex max-[767px]:flex-col">
      {before ? <div className="mb-3 max-[767px]:order-[-1] min-[768px]:order-[-2]">{before}</div> : null}
      {phoneTop ? <div className="max-[767px]:order-1 max-[767px]:mt-3.5 min-[768px]:hidden">{phoneTop}</div> : null}
      {/* DOM order = desktop order: search first, then the ONE pill row. Phones order the same pieces with the explicit order classes. */}
      <SearchFilterBar search={search} active={active} hasPanel={hasPanel} chips={chips} resultCount={resultCount} onClear={clear} settleKey={`${tab ?? ""}|${shownGroups.flatMap((g) => g.filters.map((f) => f.value)).join("|")}`}>
        {({ sheet }) => (sheet ? <SheetGroups groups={sheetGroups} /> : <PanelGroups groups={shownGroups} />)}
      </SearchFilterBar>
      {tabs && tab !== undefined && onTab && !inSheet ? (
        <div data-list-tabs className="max-[767px]:order-2 max-[767px]:mt-3 max-[767px]:[&>div]:mb-0">
          <ListTabs label={tabsLabel} tabs={tabs} value={tab} onChange={onTab} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Empty result caused by filters: names what is applied (as removable chips) and offers
 * "Clear filters". Pass the same `filters` the toolbar uses.
 */
export function NoResults({
  noun,
  filters,
  search,
  tab,
  onClear,
  onClearSearch,
}: {
  /** Plural noun, e.g. "applicants". */
  noun: string;
  filters: FilterDef[];
  search?: string;
  /** The tab chip, when a tab other than the default is selected. */
  tab?: { label: string; text: string; onRemove: () => void } | null;
  onClear: () => void;
  /** Lets the "Search" part be removed on its own. */
  onClearSearch?: () => void;
}) {
  const chips: ActiveChip[] = [
    ...(tab ? [{ key: "__tab", ...tab }] : []),
    ...(search ? [{ key: "__q", label: "Search", text: `"${search}"`, onRemove: onClearSearch ?? onClear }] : []),
    ...activeFilterChips(filters),
  ];
  const names = chips.map((c) => `${c.label}: ${c.text}`);
  const description =
    names.length === 0
      ? `There are no ${noun} here yet.`
      : names.length === 1
        ? `Nothing matches ${names[0]}. Remove it to see more ${noun}.`
        : `No ${noun} match all of these at once. Remove one to see more.`;
  return (
    <div className="py-6">
      <EmptyState
        icon={Search}
        title={`No ${noun} match`}
        description={description}
        action={
          chips.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <ul aria-label="Applied filters" className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button type="button" onClick={c.onRemove} aria-label={`Remove filter ${c.label}: ${c.text}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-(--ap-tint) pr-2.5 pl-3 text-[13px] font-semibold text-(--ap-violet) hover:bg-(--ap-line) min-[768px]:min-h-8">
                      <span className="max-w-[220px] truncate">
                        {c.label}: {c.text}
                      </span>
                      <X className="size-3.5 shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={onClear} className="ap-btn ap-btn-s ap-btn-sm">
                <X className="size-4" aria-hidden="true" /> Clear filters
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

/* ---------- loading skeleton ---------- */

export function ListSkeleton({ title, label }: { title: string; label: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <PageHeading title={title} />
      {/* Phones: same shape as the loaded page (toolbar frame, then separate item cards). */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        <div className="rounded-[20px] border border-(--ap-line) bg-(--ap-surface) p-3">
          <div className={`${sk} mb-3 h-9 w-3/4`} />
          <div className={`${sk} h-11`} />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${sk} h-[84px]`} />
        ))}
      </div>
      <div className="ap-card rounded-[20px] p-4.5 max-[767px]:hidden min-[768px]:p-5">
        <div className={`${sk} mb-4 h-10 w-56`} />
        <div className={`${sk} mb-3 h-8 w-80 max-w-full`} />
        <div className={`${sk} mb-2.5 h-11`} />
        <div className="mb-4 grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-3">
          <div className={`${sk} h-11`} />
          <div className={`${sk} h-11`} />
          <div className={`${sk} h-11`} />
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${sk} h-[55px]`} />
          ))}
        </div>
      </div>
    </div>
  );
}
