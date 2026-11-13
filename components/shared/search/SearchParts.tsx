"use client";

/** Small presentational pieces shared by the search panel, the phone sheet and the full results page. */
import type { LucideIcon } from "@/components/applicant/icons";
import { Search } from "@/components/applicant/icons";
import { GlassIcon } from "@/components/shared/icons";
import { highlightParts, initialsOf, statusTone } from "./engine";
import type { SearchChip, SearchRow } from "./useGlobalSearch";

export function Highlight({ text, terms }: { text: string; terms: string }) {
  if (!terms) return <>{text}</>;
  return (
    <>
      {highlightParts(text, terms).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-[3px] bg-(--ap-tint) px-px font-extrabold text-(--ap-violet)">
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  );
}

const DOT: Record<string, string> = { ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-rose-500", mute: "bg-(--ap-faint)" };

export function StatusDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-(--ap-muted)">
      <span className={`size-1.5 rounded-full ${DOT[statusTone(label)]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

type ItemRow = Extract<SearchRow, { kind: "item" }>;

const LEAD_BG = "color-mix(in srgb, var(--ap-lilac, #efe6f7) 85%, var(--ap-tint-soft, #fff))";

/** 36px rounded icon tile, or an initials circle for a person (desktop and tablet rows). */
export function DeskLead({ title, icon: Icon, person }: { title: string; icon: LucideIcon; person?: boolean }) {
  return person ? (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-(--ap-violet)" style={{ background: LEAD_BG }} aria-hidden="true">
      {initialsOf(title)}
    </span>
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-(--ap-violet)" style={{ background: LEAD_BG }} aria-hidden="true">
      <Icon className="size-[18px]" strokeWidth={1.8} />
    </span>
  );
}

/** One result: icon or initials, title with the matched text highlighted, a muted line, a status dot and a quiet type hint. */
export function ResultRow({ row, active, onPick, onHover, fullHint = true }: { row: ItemRow; active?: boolean; onPick: (e: React.MouseEvent) => void; onHover?: () => void; fullHint?: boolean }) {
  const Icon = row.icon;
  return (
    <button
      type="button"
      id={`gs-${row.id}`}
      role="option"
      aria-selected={!!active}
      onClick={onPick}
      onMouseMove={onHover}
      className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left ${active ? "bg-(--ap-line-2)" : "hover:bg-(--ap-line-2)"}`}
    >
      <DeskLead title={row.title} icon={Icon} person={row.person} />
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block truncate text-[14px] font-semibold text-(--ap-ink)">
          <Highlight text={row.title} terms={row.terms} />
        </b>
        {row.subtitle ? (
          <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">
            <Highlight text={row.subtitle} terms={row.terms} />
          </span>
        ) : null}
      </span>
      {row.status || (fullHint && row.hint) ? (
        <span className="flex shrink-0 flex-col items-end gap-0.5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:gap-3">
          {row.status ? <StatusDot label={row.status} /> : null}
          {fullHint && row.hint ? <span className="hidden min-w-[52px] text-right text-[12px] text-(--ap-faint) min-[768px]:inline">{row.hint}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

type ActionRowData = Extract<SearchRow, { kind: "action" }>;

/** One action: icon, plain label, a muted area, and a shortcut hint only when a real shortcut exists. */
export function ActionRow({ row, active, onPick, onHover, hideCategory }: { row: ActionRowData; active?: boolean; onPick: () => void; onHover?: () => void; hideCategory?: boolean }) {
  const a = row.action;
  const Icon = a.icon;
  return (
    <button type="button" id={`gs-${row.id}`} role="option" aria-selected={!!active} onClick={onPick} onMouseMove={onHover} className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left ${active ? "bg-(--ap-line-2)" : "hover:bg-(--ap-line-2)"}`}>
      <DeskLead title={a.title} icon={Icon} />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--ap-ink)">
        <Highlight text={a.title} terms={row.terms} />
        {hideCategory ? null : <span className="ml-2 text-[13px] font-normal text-(--ap-muted)">{a.category}</span>}
      </span>
      {a.shortcut?.length ? (
        <span className="flex shrink-0 gap-1">
          {a.shortcut.map((k) => (
            <kbd key={k} className="rounded-md border border-(--ap-line) px-1.5 py-0.5 text-[11px] font-semibold text-(--ap-faint)">
              {k}
            </kbd>
          ))}
        </span>
      ) : null}
    </button>
  );
}

export function MoreRow({ title, active, onPick, onHover, id }: { title: string; active?: boolean; onPick: () => void; onHover?: () => void; id: string }) {
  return (
    <button type="button" id={`gs-${id}`} role="option" aria-selected={!!active} onClick={onPick} onMouseMove={onHover} className={`ml-[54px] flex h-9 items-center rounded-lg px-2.5 text-[13px] font-bold text-(--ap-violet) ${active ? "bg-(--ap-line-2)" : "hover:bg-(--ap-line-2)"}`}>
      {title}
    </button>
  );
}

export function RecentRow({ title, id, active, onPick, onHover }: { title: string; id: string; active?: boolean; onPick: () => void; onHover?: () => void }) {
  return (
    <button type="button" id={`gs-${id}`} role="option" aria-selected={!!active} onClick={onPick} onMouseMove={onHover} className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left ${active ? "bg-(--ap-line-2)" : "hover:bg-(--ap-line-2)"}`}>
      <DeskLead title={title} icon={Search} />
      <span className="min-w-0 flex-1 truncate text-[14px] text-(--ap-ink-2)">{title}</span>
    </button>
  );
}

export function GroupHeading({ label, count, action }: { label: string; icon?: LucideIcon; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2.5 pt-3.5 pb-1.5">
      <h3 className="m-0 text-[11px] font-bold tracking-[.09em] text-(--ap-muted) uppercase">{label}</h3>
      {count !== undefined ? <span className="rounded-full bg-(--ap-line-2) px-1.5 text-[11px] leading-[18px] font-bold text-(--ap-muted)">{count}</span> : null}
      {action ? <span className="ml-auto">{action}</span> : null}
    </div>
  );
}

export function ChipRow({ chips, value, onPick, className = "" }: { chips: SearchChip[]; value: string | null; onPick: (key: string | null) => void; className?: string }) {
  if (chips.length === 0) return null;
  return (
    <div role="group" aria-label="Filter by type" className={`flex gap-1.5 overflow-x-auto [scrollbar-width:none] ${className}`}>
      {chips.map((c) => {
        const on = c.key === value;
        return (
          <button
            key={c.key ?? "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(c.key)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-tint) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
          >
            {c.label}
            <span className={`text-[12px] ${on ? "text-(--ap-violet)" : "text-(--ap-faint)"}`}>{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Note({ title, children, glassSize }: { title: string; children?: React.ReactNode; /** Empty "nothing found" notes: show the glass search icon at this size (px). */ glassSize?: number }) {
  return (
    <div className={`flex flex-col items-center px-6 text-center ${glassSize && glassSize <= 56 ? "py-5" : "py-9"}`}>
      {glassSize ? <GlassIcon name="search" size={glassSize} /> : <Search className="size-6 text-(--ap-faint)" aria-hidden="true" />}
      <p className={`${glassSize ? "mt-1" : "mt-3"} text-[15px] font-semibold text-(--ap-ink)`}>{title}</p>
      {children ? <div className="mt-1 max-w-xs text-[13px] text-(--ap-muted)">{children}</div> : null}
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="flex flex-col gap-3.5 px-3 py-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-(--ap-line-2)" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-1/2 animate-pulse rounded bg-(--ap-line-2)" />
            <span className="block h-3 w-3/4 animate-pulse rounded bg-(--ap-line-2)" />
          </span>
        </div>
      ))}
    </div>
  );
}
