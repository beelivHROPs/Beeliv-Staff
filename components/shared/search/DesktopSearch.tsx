"use client";

/**
 * Desktop / tablet pieces of the search panel under the top field: the empty-query suggestions
 * (Recent as removable pills, Quick actions as bold icon tiles, Browse pages as chips), the
 * no-results state and the quiet keyboard-hint footer. Presentation only; the state lives in
 * useGlobalSearch. The phone sheet has its own touch-sized versions in PhoneSearch.tsx.
 */
import { Search, X } from "@/components/applicant/icons";
import { BoldTile, GlassIcon } from "@/components/shared/icons";
import { glyphForAction } from "./PhoneSearch";
import type { SearchAction, SearchShortcut } from "./types";

function Label({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2.5 pt-3.5 pb-1.5">
      <h3 className="m-0 text-[11px] font-bold tracking-[.09em] text-(--ap-muted) uppercase">{children}</h3>
      {action}
    </div>
  );
}

const LINK_BTN = "text-[12px] font-bold text-(--ap-muted) hover:text-(--ap-violet)";

/** Recent searches as small pills, each with its own remove button. */
export function DeskRecent({ items, activeId, onPick, onRemove, onClear }: { items: { id: string; title: string }[]; activeId?: string; onPick: (id: string) => void; onRemove: (title: string) => void; onClear: () => void }) {
  if (items.length === 0) return null;
  return (
    <section>
      <Label
        action={
          <button type="button" onClick={onClear} className={LINK_BTN}>
            Clear all
          </button>
        }
      >
        Recent
      </Label>
      <ul className="m-0 flex list-none flex-wrap gap-2 px-2.5 pb-1">
        {items.map((r) => (
          <li key={r.id} className={`flex h-8 items-center rounded-full border bg-(--ap-surface) text-(--ap-ink) ${activeId === `gs-${r.id}` ? "border-(--ap-violet)" : "border-(--ap-line)"}`}>
            <button type="button" id={`gs-${r.id}`} role="option" aria-selected={activeId === `gs-${r.id}`} onClick={() => onPick(r.id)} className="inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-l-full pr-1 pl-3 text-[13px] font-semibold">
              <Search className="size-3.5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
              <span className="truncate">{r.title}</span>
            </button>
            <button type="button" onClick={() => onRemove(r.title)} aria-label={`Remove ${r.title}`} className="inline-flex size-8 items-center justify-center rounded-r-full text-(--ap-muted) hover:text-(--ap-ink)">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Up to four bold quick-action tiles in one row. */
export function DeskQuickTiles({ items, activeId, onPick, onMore }: { items: { id: string; action: SearchAction }[]; activeId?: string; onPick: (id: string) => void; onMore?: () => void }) {
  const list = items.slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section>
      <Label
        action={
          onMore ? (
            <button type="button" onClick={onMore} className={LINK_BTN}>
              See all
            </button>
          ) : undefined
        }
      >
        Quick actions
      </Label>
      <ul className="m-0 grid list-none grid-cols-4 gap-2 px-2.5 pb-1 max-[640px]:grid-cols-2">
        {list.map((q, i) => {
          const on = activeId === `gs-${q.id}`;
          return (
            <li key={q.id}>
              <button
                type="button"
                id={`gs-${q.id}`}
                role="option"
                aria-selected={on}
                onClick={() => onPick(q.id)}
                className={`flex min-h-[92px] w-full flex-col items-start justify-between gap-2 rounded-[14px] border bg-(--ap-surface) p-2.5 text-left hover:bg-(--ap-line-2) ${on ? "border-(--ap-violet)" : "border-(--ap-line)"}`}
              >
                <BoldTile glyph={glyphForAction(q.action)} tint={i === 0 ? "plum" : "lavender"} size={40} weight="bold" />
                <span className="text-[13px] leading-snug font-bold text-(--ap-ink)">{q.action.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Browse pages": the most used screens as chips. */
export function DeskBrowse({ pages, onPick }: { pages: SearchShortcut[]; onPick: (p: SearchShortcut) => void }) {
  if (pages.length === 0) return null;
  return (
    <section>
      <Label>Browse pages</Label>
      <ul className="m-0 flex list-none flex-wrap gap-2 px-2.5 pb-2">
        {pages.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-(--ap-line) bg-(--ap-surface) px-3 text-[13px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)">
                <Icon className="size-3.5 text-(--ap-violet)" strokeWidth={1.9} aria-hidden="true" />
                {p.title}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Glass search icon and the one "Clear search" action. */
export function DeskNoResults({ term, onClear }: { term: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 pt-7 pb-6 text-center">
      <GlassIcon name="search" size={72} />
      <p className="mt-2 text-[15px] font-bold text-(--ap-ink)">Nothing found for &quot;{term}&quot;</p>
      <p className="mt-1 max-w-xs text-[13px] text-(--ap-muted)">Try a name, a reference or a shorter word.</p>
      <button type="button" onClick={onClear} className="mt-4 inline-flex h-9 items-center rounded-full bg-(--ap-violet) px-5 text-[13px] font-semibold text-white">
        Clear search
      </button>
    </div>
  );
}

const KBD = "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-(--ap-line) bg-(--ap-surface) px-1 text-[10.5px] font-bold text-(--ap-muted)";

/** Quiet footer: the keys that work in the panel. */
export function DeskFooter() {
  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-(--ap-line-2) bg-(--ap-surface) px-4 py-2 text-[12px] text-(--ap-faint)" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5">
        <kbd className={KBD}>↑</kbd>
        <kbd className={KBD}>↓</kbd>
        Move
      </span>
      <span className="inline-flex items-center gap-1.5">
        <kbd className={`${KBD} px-1.5`}>Enter</kbd>
        Search or open
      </span>
      <span className="inline-flex items-center gap-1.5">
        <kbd className={`${KBD} px-1.5`}>Esc</kbd>
        Close
      </span>
    </div>
  );
}
