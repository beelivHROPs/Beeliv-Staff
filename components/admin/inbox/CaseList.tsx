"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Funnel, Search, Settings, SlidersHorizontal } from "@/components/applicant/icons";
import { useIsPhone } from "@/components/applicant/motion";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { Chip } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { inboxItemHref } from "@/lib/admin/links";
import type { InboxCaseCategory, InboxCaseSummary, InboxStatus } from "@/lib/admin/inbox/types";
import { Paperclip, Tick } from "./Glyphs";
import { CATEGORY_LABEL, CATEGORY_ORDER, initials, listStamp, STATUS_CHIP, STATUS_LABEL, STATUS_ORDER } from "./meta";

export type ViewFilter = "all" | "unread" | "mine" | "unassigned";

export interface ListFilters {
  q: string;
  view: ViewFilter;
  category: InboxCaseCategory | "all";
  status: InboxStatus | "all";
}

/** Display preferences for the list (UI only, nothing is saved to the case). */
export interface InboxPrefs {
  previews: boolean;
  compact: boolean;
}
export const DEFAULT_PREFS: InboxPrefs = { previews: true, compact: false };

function PrefSwitch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-(--ap-line-2)">
      <span className="min-w-0">
        <b className="block text-[14px] font-semibold">{label}</b>
        <span className="block text-[12px] text-(--ap-muted)">{hint}</span>
      </span>
      <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-(--ap-violet)" : "bg-(--ap-line)"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export const NO_FILTERS: ListFilters = { q: "", view: "all", category: "all", status: "all" };

export function filtersActive(f: ListFilters): boolean {
  return f.q.trim() !== "" || f.view !== "all" || f.category !== "all" || f.status !== "all";
}

export function applyFilters(cases: InboxCaseSummary[], f: ListFilters, meId: string | null): InboxCaseSummary[] {
  const q = f.q.trim().toLowerCase();
  return cases.filter((c) => {
    if (f.view === "unread" && !c.unread) return false;
    if (f.view === "mine" && c.assignedTo?.id !== meId) return false;
    if (f.view === "unassigned" && c.assignedTo) return false;
    if (f.category !== "all" && c.category !== f.category) return false;
    if (f.status !== "all" && c.status !== f.status) return false;
    if (q && !`${c.subject} ${c.sender.name} ${c.sender.organisation ?? ""} ${c.reference}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const VIEWS: { key: ViewFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mine", label: "Assigned to me" },
  { key: "unassigned", label: "Unassigned" },
];

export function CaseToolbar({ filters, onChange, counts, prefs, onPrefs }: { filters: ListFilters; onChange: (f: ListFilters) => void; counts: Partial<Record<ViewFilter, number>>; prefs: InboxPrefs; onPrefs: (p: InboxPrefs) => void }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const phone = useIsPhone();
  const extra = (filters.category !== "all" ? 1 : 0) + (filters.status !== "all" ? 1 : 0);
  return (
    <div className="flex flex-col gap-2.5 p-3 pb-2 max-[767px]:mb-4 max-[767px]:p-0">
      {phone ? (
        <SearchBar
          className=""
          search={{ value: filters.q, onChange: (q) => onChange({ ...filters, q }), label: "Search cases", placeholder: "Search cases" }}
          settleKey={`${filters.view}|${filters.category}|${filters.status}`}
          filterSlot={
            <button
              type="button"
              aria-expanded={open}
              aria-label={extra ? `Filters, ${extra} applied` : "Filters"}
              onClick={() => setOpen((o) => !o)}
              className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border bg-white ${open || extra ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink)"}`}
            >
              <Funnel className="size-5" strokeWidth={1.7} aria-hidden="true" />
              {extra ? <span className="absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-(--ap-violet) text-[12px] font-bold text-white">{extra}</span> : null}
            </button>
          }
        />
      ) : null}
      <div className="flex items-center gap-1.5 max-[767px]:hidden">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-(--ap-faint)" aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            placeholder="Search cases"
            className="ap-input h-10! rounded-full! border-transparent! bg-(--ap-line-2)! pl-10!"
          />
        </label>
          <button
            type="button"
            aria-expanded={open}
            aria-label="Filter by category and status"
            onClick={() => setOpen((o) => !o)}
            className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-white hover:bg-(--ap-line-2) ${open || extra ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2)"}`}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {extra ? <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-(--ap-violet) text-[10px] font-bold text-white">{extra}</span> : null}
          </button>
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-label="Inbox settings"
            onClick={() => setSettingsOpen((o) => !o)}
            className={`inline-flex max-[719px]:hidden size-10 shrink-0 items-center justify-center rounded-full border bg-white hover:bg-(--ap-line-2) ${settingsOpen ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2)"}`}
          >
            <Settings className="size-4" aria-hidden="true" />
          </button>
      </div>
      <div className="flex items-center gap-1.5">
        <div role="group" aria-label="Case view" className="ap-scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto min-[768px]:flex-wrap min-[768px]:gap-2 min-[768px]:overflow-visible">
          {VIEWS.map((v) => {
            const on = filters.view === v.key;
            const n = counts[v.key];
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...filters, view: v.key })}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 min-[768px]:h-9 min-[768px]:px-3.5 text-[13px] font-bold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
              >
                {v.label}
                {n !== undefined ? <span className={`tabular-nums ${on ? "text-white/85" : "text-(--ap-violet)"}`}>{n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {settingsOpen ? (
        <div className="rounded-2xl border border-(--ap-line) bg-white p-1.5" aria-label="Inbox settings">
          <PrefSwitch label="Message previews" hint="Show the latest message under each name" on={prefs.previews} onChange={(v) => onPrefs({ ...prefs, previews: v })} />
          <PrefSwitch label="Compact list" hint="Smaller rows, more cases on screen" on={prefs.compact} onChange={(v) => onPrefs({ ...prefs, compact: v })} />
        </div>
      ) : null}
      {open ? (
        <div className="grid grid-cols-2 gap-2">
          <SelectMenu
            variant="compact"
            label="Category"
            value={filters.category}
            onChange={(v) => onChange({ ...filters, category: v as ListFilters["category"] })}
            options={[{ value: "all", label: "All categories" }, ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]}
            className="min-w-0"
          />
          <SelectMenu
            variant="compact"
            label="Status"
            value={filters.status}
            onChange={(v) => onChange({ ...filters, status: v as ListFilters["status"] })}
            options={[{ value: "all", label: "All statuses" }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            className="min-w-0"
          />
        </div>
      ) : null}
    </div>
  );
}

export function CaseList({
  cases,
  selectedId,
  onOpen,
  prefs = DEFAULT_PREFS,
}: {
  cases: InboxCaseSummary[];
  selectedId: string | null;
  /** The handler decides between selecting in place (wide) and navigating (narrow). */
  onOpen: (e: MouseEvent<HTMLAnchorElement>, id: string) => void;
  prefs?: InboxPrefs;
}) {
  // Phones: five cases, then "Show more" (wide layouts show everything).
  const [more, setMore] = useState(false);
  const hidden = (i: number) => (!more && i >= 5 ? "max-[719px]:hidden" : "");
  return (
    <>
    <ul className="m-0 flex list-none flex-col p-0 max-[719px]:gap-2.5">
      {cases.map((c, i) => {
        const on = c.id === selectedId;
        const showChip = c.status === "waiting-on-sender" || c.status === "escalated" || c.status === "resolved";
        return (
          <li key={c.id} className={`${hidden(i)} relative after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px after:bg-(--ap-line-2) last:after:hidden max-[719px]:overflow-hidden max-[719px]:rounded-[20px] max-[719px]:border max-[719px]:border-(--ap-line) max-[719px]:bg-(--ap-surface) max-[719px]:after:hidden`}>
            <Link
              href={inboxItemHref(c.id)}
              onClick={(e) => onOpen(e, c.id)}
              aria-current={on ? "true" : undefined}
              className={`flex items-center gap-3 px-3 ${prefs.compact ? "py-1.5" : "py-2.5"} ${on ? "bg-(--ap-tint)" : "hover:bg-(--ap-line-2)/60"}`}
            >
              <span className={`flex shrink-0 ${prefs.compact ? "size-10" : "size-12"} items-center justify-center rounded-full bg-(--ap-lilac) items-center justify-center rounded-full bg-(--ap-lilac) text-[15px] font-bold text-(--ap-violet)`} aria-hidden="true">
                {initials(c.sender.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[16px] font-bold">{c.sender.name}</span>
                  <time dateTime={c.lastActivityAt} className={`shrink-0 text-[12px] ${c.unread ? "font-bold text-(--ap-violet)" : "text-(--ap-faint)"}`}>
                    {listStamp(c.lastActivityAt)}
                  </time>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  {c.lastFromUs ? (
                    <span className="inline-flex shrink-0 text-(--ap-violet)" title="Replied">
                      <Tick className="size-4" />
                      <span className="sr-only">Replied:</span>
                    </span>
                  ) : null}
                  {c.attachmentCount > 0 ? (
                    <span className="inline-flex shrink-0 text-(--ap-muted)">
                      <Paperclip className="size-3.5" />
                      <span className="sr-only">Has attachment:</span>
                    </span>
                  ) : null}
                  {prefs.previews ? <span className={`min-w-0 flex-1 truncate text-[14px] ${c.unread ? "font-semibold text-(--ap-ink)" : "text-(--ap-muted)"}`}>{c.preview}</span> : <span className="min-w-0 flex-1" />}
                  {showChip ? <span className="max-[719px]:hidden"><Chip tone={STATUS_CHIP[c.status]}>{STATUS_LABEL[c.status]}</Chip></span> : null}
                  {c.unreadCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-(--ap-violet) px-1.5 text-[12px] font-bold text-white">
                      {c.unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : c.needsAction ? (
                    <span className="shrink-0" title="Needs action">
                      <AttentionBadge className="size-5" halo={false} />
                      <span className="sr-only">Needs action</span>
                    </span>
                  ) : null}
                </span>
                {showChip ? <span className="mt-1 block min-[720px]:hidden"><Chip tone={STATUS_CHIP[c.status]}>{STATUS_LABEL[c.status]}</Chip></span> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
    {!more && cases.length > 5 ? (
      <button type="button" onClick={() => setMore(true)} className="ap-btn ap-btn-s mx-auto mt-3 h-11 min-[720px]:hidden">
        Show {cases.length - 5} more
      </button>
    ) : null}
    </>
  );
}
