"use client";

/**
 * Phone-only pieces of the search experience (full-screen sheet and results page, under 768px).
 * Look: the Applicant Jobs search card, removable recent pills, bold quick-action tiles, grouped
 * results with count headings and one premium row per result. Presentation only; the state lives in
 * useGlobalSearch / the results page. Desktop keeps SearchParts.tsx.
 */
import { BoldTile, GlassIcon, type GlyphName } from "@/components/shared/icons";
import { Search, X } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { initialsOf } from "./engine";
import { Highlight, StatusDot } from "./SearchParts";
import type { SearchAction } from "./types";
import type { SearchRow } from "./useGlobalSearch";

/** A bold glyph for an action, picked from its words (no new data needed on the provider). */
export function glyphForAction(a: Pick<SearchAction, "title" | "category">): GlyphName {
  const t = `${a.title} ${a.category}`.toLowerCase();
  if (/interview|schedul|calendar|leave|shift|roster|attendance/.test(t)) return "calendar";
  if (/job|role|vacanc|position|request|placement|hire|recruit/.test(t)) return "briefcase";
  if (/profile|account|people|person|staff|client|applicant|user/.test(t)) return "profile";
  if (/document|upload|sop|policy/.test(t)) return "upload";
  if (/notif|announce|message|inbox/.test(t)) return "bell";
  if (/security|password|sign|privacy/.test(t)) return "shield";
  return "clipboard";
}

const TILE_BG = "color-mix(in srgb, var(--ap-lilac, #efe6f7) 85%, var(--ap-tint-soft, #fff))";

/** Round avatar (people) or rounded icon tile (everything else), 44px. */
export function ResultLead({ title, icon: Icon, person }: { title: string; icon: LucideIcon; person?: boolean }) {
  return person ? (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-(--ap-violet)" style={{ background: TILE_BG }} aria-hidden="true">
      {initialsOf(title)}
    </span>
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] text-(--ap-violet)" style={{ background: TILE_BG }} aria-hidden="true">
      <Icon className="size-[21px]" strokeWidth={1.8} />
    </span>
  );
}

type ItemRow = Extract<SearchRow, { kind: "item" }>;

/** One result: lead, title, one muted line, one status word. 64px tall, whole row is the button. */
export function PhoneResultRow({ row, active, onPick }: { row: ItemRow; active?: boolean; onPick: () => void }) {
  return (
    <button type="button" id={`gs-${row.id}`} role="option" aria-selected={!!active} onClick={onPick} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-(--ap-line-2) ${active ? "bg-(--ap-line-2)" : ""}`}>
      <ResultLead title={row.title} icon={row.icon} person={row.person} />
      <span className="min-w-0 flex-1 leading-tight">
        <b className="line-clamp-2 text-[16px] leading-snug font-bold text-(--ap-ink)">
          <Highlight text={row.title} terms={row.terms} />
        </b>
        {row.subtitle ? (
          <span className="mt-0.5 line-clamp-2 text-[14px] text-(--ap-muted)">
            <Highlight text={row.subtitle} terms={row.terms} />
          </span>
        ) : null}
      </span>
      {row.status ? <StatusDot label={row.status} /> : null}
    </button>
  );
}

/** "See all results" / "Search jobs for ..." style row. */
export function PhoneLinkRow({ id, title, icon: Icon, active, onPick }: { id: string; title: string; icon: LucideIcon; active?: boolean; onPick: () => void }) {
  return (
    <button type="button" id={`gs-${id}`} role="option" aria-selected={!!active} onClick={onPick} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left text-[15px] font-semibold text-(--ap-violet) active:bg-(--ap-line-2) ${active ? "bg-(--ap-line-2)" : ""}`}>
      <Icon className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{title}</span>
    </button>
  );
}

export function PhoneMoreRow({ id, label = "Show more", active, onPick }: { id: string; label?: string; active?: boolean; onPick: () => void }) {
  return (
    <button type="button" id={`gs-${id}`} role="option" aria-selected={!!active} onClick={onPick} className={`mt-1 flex h-11 w-full items-center justify-center rounded-full border border-(--ap-line) text-[15px] font-semibold text-(--ap-ink) active:bg-(--ap-line-2) ${active ? "bg-(--ap-line-2)" : ""}`}>
      {label}
    </button>
  );
}

/** "Browse pages": the most used screens as chips (phone, 44px tall). */
export function PhoneBrowse({ pages, onPick }: { pages: { id: string; title: string; href: string; icon: LucideIcon }[]; onPick: (p: { id: string; title: string; href: string; icon: LucideIcon }) => void }) {
  if (pages.length === 0) return null;
  return (
    <section>
      <PhoneLabel>Browse pages</PhoneLabel>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {pages.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} className="inline-flex h-11 items-center gap-2 rounded-full border border-(--ap-line) bg-(--ap-surface) px-4 text-[15px] font-semibold text-(--ap-ink)">
                <Icon className="size-4 text-(--ap-violet)" strokeWidth={1.9} aria-hidden="true" />
                {p.title}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Jobs (6)" heading. */
export function PhoneGroupHeading({ label, count }: { label: string; count?: number }) {
  return (
    <h3 className="m-0 px-2 pt-5 pb-1 text-[18px] font-bold text-(--ap-ink)">
      {label}
      {count !== undefined ? <span className="font-semibold text-(--ap-muted)"> ({count})</span> : null}
    </h3>
  );
}

/** Small section label before searching ("Recent searches"). */
export function PhoneLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-6 pb-2.5">
      <h3 className="m-0 text-[18px] font-bold text-(--ap-ink)">{children}</h3>
      {action}
    </div>
  );
}

/** Recent searches as pills, each with its own remove button. */
export function RecentPills({ items, onPick, onRemove, onClear }: { items: string[]; onPick: (t: string) => void; onRemove: (t: string) => void; onClear: () => void }) {
  if (items.length === 0) return null;
  return (
    <section>
      <PhoneLabel
        action={
          <button type="button" onClick={onClear} className="-mr-2 inline-flex h-11 items-center px-2 text-[15px] font-semibold text-(--ap-violet)">
            Clear all
          </button>
        }
      >
        Recent searches
      </PhoneLabel>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.map((t) => (
          <li key={t} className="flex h-11 items-center rounded-full border border-(--ap-line) bg-(--ap-surface) text-(--ap-ink)">
            <button type="button" onClick={() => onPick(t)} className="inline-flex h-11 max-w-[220px] items-center gap-2 rounded-l-full pr-1 pl-4 text-[15px] font-semibold">
              <Search className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" />
              <span className="truncate">{t}</span>
            </button>
            <button type="button" onClick={() => onRemove(t)} aria-label={`Remove ${t}`} className="inline-flex size-11 items-center justify-center rounded-r-full text-(--ap-muted)">
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** At most four bold quick-action tiles in a 2 x 2 grid. */
export function QuickTiles({ actions, onPick, onMore }: { actions: SearchAction[]; onPick: (a: SearchAction) => void; onMore?: () => void }) {
  const list = actions.slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section>
      <PhoneLabel
        action={
          onMore ? (
            <button type="button" onClick={onMore} className="-mr-2 inline-flex h-11 items-center px-2 text-[15px] font-semibold text-(--ap-violet)">
              See all
            </button>
          ) : undefined
        }
      >
        Quick actions
      </PhoneLabel>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
        {list.map((a, i) => (
          <li key={a.id}>
            <button type="button" onClick={() => onPick(a)} className="flex min-h-[104px] w-full flex-col items-start justify-between gap-3 rounded-[18px] border border-(--ap-line) bg-(--ap-surface) p-3.5 text-left shadow-(--ap-shadow) active:bg-(--ap-line-2)">
              <BoldTile glyph={glyphForAction(a)} tint={i === 0 ? "plum" : "lavender"} size={44} weight="bold" />
              <span className="text-[15px] leading-snug font-bold text-(--ap-ink)">{a.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Glass empty state with the one "Clear search" action. */
export function PhoneNoResults({ term, onClear }: { term: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-6 text-center">
      <GlassIcon name="search" size={96} />
      <p className="mt-2 text-[18px] font-bold text-(--ap-ink)">Nothing found for &quot;{term}&quot;</p>
      <p className="mt-1 max-w-[280px] text-[15px] text-(--ap-muted)">Try a name, a reference or a shorter word.</p>
      <button type="button" onClick={onClear} className="mt-5 inline-flex h-12 items-center rounded-full bg-(--ap-violet) px-7 text-[16px] font-semibold text-white">
        Clear search
      </button>
    </div>
  );
}

export function PhoneSpinner() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 px-6 py-16 text-(--ap-muted)">
      <svg viewBox="0 0 24 24" className="size-9 animate-spin text-(--ap-violet) motion-reduce:animate-none" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-[16px] font-semibold">Searching</span>
    </div>
  );
}

/** "Press Enter to search" hint, with a key cap. */
export function EnterHint() {
  return (
    <p className="mt-5 text-center text-[15px] font-semibold text-(--ap-muted)">Press Enter to search.</p>
  );
}

/** Type chips as a horizontal pill row, 44px tall. */
export function PhoneChips({ chips, value, onPick }: { chips: { key: string | null; label: string; count: number }[]; value: string | null; onPick: (k: string | null) => void }) {
  if (chips.length === 0) return null;
  return (
    <div role="group" aria-label="Filter by type" className="ap-scrollbar-none flex gap-2 overflow-x-auto px-[18px] py-0.5">
      {chips.map((c) => {
        const on = c.key === value;
        return (
          <button key={c.key ?? "all"} type="button" aria-pressed={on} onClick={() => onPick(c.key)} className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink)"}`}>
            {c.label}
            <span className={`text-[13px] ${on ? "text-white/80" : "text-(--ap-muted)"}`}>{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}
