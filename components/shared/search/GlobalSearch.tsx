"use client";

/**
 * Global search for the top bar of every app (Admin, Client, Staff, Applicant).
 *
 *   <GlobalSearch provider={...} />        desktop / tablet field (opens a panel under it)
 *   <GlobalSearchButton provider={...} />  phone header icon (opens a full-screen sheet)
 *
 * Opens on click / focus, Ctrl+K or "/". Arrow keys move, Enter opens, Esc closes. The
 * panel groups results by type (up to five each, "See all N" for the rest) under a first
 * "Go to" group that keeps the old navigation shortcuts. Presentation only: the provider
 * decides what is searchable (and already scoped to the signed-in person).
 */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "@/components/applicant/icons";
import { ChevronLeft, Search, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { MIN_QUERY } from "./engine";
import { DeskBrowse, DeskFooter, DeskNoResults, DeskQuickTiles, DeskRecent } from "./DesktopSearch";
import { ActionRow, ChipRow, GroupHeading, MoreRow, Note, RecentRow, ResultRow, Skeleton } from "./SearchParts";
import { EnterHint, PhoneBrowse, PhoneChips, PhoneGroupHeading, PhoneLinkRow, PhoneMoreRow, PhoneNoResults, PhoneResultRow, PhoneSpinner, QuickTiles, RecentPills, ResultLead } from "./PhoneSearch";
import type { SearchProvider } from "./types";
import { useGlobalSearch, type GlobalSearchController } from "./useGlobalSearch";

/** z-[150]: above the shells' sheets (110) and dialogs (130). */
const Z = "z-[150]";

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/* ------------------------------------------------------------------ */
/* Panel body (shared by the popover and the phone sheet)              */
/* ------------------------------------------------------------------ */

function Results({ s, listId, className, onClear }: { s: GlobalSearchController; listId: string; className?: string; onClear: () => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    if (!s.activeId) return;
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(s.activeId)}`)?.scrollIntoView({ block: "nearest" });
  }, [s.activeId]);

  const emptyQuery = s.settled === "" && !s.commandMode;
  // Empty search: Recent (removable pills), Quick actions (tiles) and Browse pages (chips) instead of a plain list.
  const idle = emptyQuery && !s.awaitingEnter && !s.type;
  const quickSec = s.sections.find((x) => x.key === "actions-empty");
  const quickItems = (quickSec?.rows ?? []).flatMap((r) => (r.kind === "action" ? [{ id: r.id, action: r.action }] : []));
  const quickMore = quickSec?.rows.find((r) => r.kind === "more");
  const recentRows = (s.sections.find((x) => x.key === "recent")?.rows ?? []).flatMap((r) => (r.kind === "recent" ? [r] : []));
  const rowById = (id: string) => s.flat.find((r) => r.id === id);
  const browseTo = (p: { id: string; title: string; href: string; icon: LucideIcon }) => s.choose({ kind: "item", id: p.id, title: p.title, icon: p.icon, href: p.href, terms: "" });
  return (
    <div ref={listRef} className={className}>
      {s.chips.length > 0 ? (
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 border-b border-(--ap-line-2) bg-(--ap-surface) px-3 py-2">
          <ChipRow chips={s.chips} value={s.type} onPick={s.setChip} />
        </div>
      ) : null}
      {s.type && !s.searching ? <p className="px-2.5 pt-2 text-[13px] text-(--ap-muted)">Searching in {s.typeLabel}. Type to narrow it down.</p> : null}
      {s.submitting ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2.5 px-3 py-8 text-(--ap-muted)">
          <svg viewBox="0 0 24 24" className="size-7 animate-spin text-(--ap-violet) motion-reduce:animate-none" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-[14px] font-semibold">Searching</span>
        </div>
      ) : null}
      {s.awaitingEnter ? <p className="px-2.5 pt-2 text-[13px] text-(--ap-muted)">Press Enter to search.</p> : null}
      {s.loading && s.flat.length === 0 && !s.submitting ? <Skeleton /> : null}
      <div hidden={s.submitting}>
      {s.failed ? (
        <Note title="Search is not available right now">
          Try again in a moment.{" "}
          <button type="button" onClick={s.retry} className="font-bold text-(--ap-violet)">
            Try again
          </button>
        </Note>
      ) : null}
      {s.noResults ? <DeskNoResults term={s.term} onClear={onClear} /> : null}
      {idle ? (
        <>
          <DeskRecent items={recentRows} activeId={s.activeId} onPick={(id) => { const row = rowById(id); if (row) s.choose(row); }} onRemove={s.removeRecent} onClear={s.clearRecent} />
          <DeskQuickTiles items={quickItems} activeId={s.activeId} onPick={(id) => { const row = rowById(id); if (row) s.choose(row); }} onMore={quickMore ? () => s.choose(quickMore) : undefined} />
          <DeskBrowse pages={s.provider.shortcuts} onPick={browseTo} />
        </>
      ) : null}
      {s.noActions ? <Note title={`No action called "${s.query.replace(/^\s*>\s*/, "")}"`}>Try a simpler word, like new, add or open.</Note> : null}
      {s.tooShort && s.sections.every((x) => x.key === "fallback") ? <Note title="Keep typing">Type at least {MIN_QUERY} letters to search everything.</Note> : null}
      <ul id={listId} role="listbox" aria-label="Search results" className="m-0 list-none p-0">
        {(idle ? [] : s.sections).map((sec) => (
          <li key={sec.key} role="presentation" className="pb-1 last:pb-0">
            {sec.label ? <GroupHeading label={sec.label} icon={sec.icon} count={sec.icon ? sec.count : undefined} action={sec.clearable ? <button type="button" onClick={s.clearRecent} className="text-[12px] font-bold text-(--ap-muted) hover:text-(--ap-violet)">Clear</button> : undefined} /> : null}
            <ul role="presentation" className="m-0 list-none p-0">
              {sec.rows.map((row) => {
                const active = s.activeId === `gs-${row.id}`;
                const hover = () => s.setActive(row.id);
                return (
                  <li key={row.id} role="presentation">
                    {row.kind === "action" ? (
                      <ActionRow row={row} active={active} hideCategory={sec.key.startsWith("cat-")} onHover={hover} onPick={() => s.choose(row)} />
                    ) : row.kind === "item" ? (
                      <ResultRow row={row} active={active} onHover={hover} onPick={(e) => s.choose(row, e.ctrlKey || e.metaKey)} />
                    ) : row.kind === "more" ? (
                      <MoreRow id={row.id} title={row.title} active={active} onHover={hover} onPick={() => s.choose(row)} />
                    ) : (
                      <RecentRow id={row.id} title={row.title} active={active} onHover={hover} onPick={() => s.choose(row)} />
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {emptyQuery ? <p className="px-2.5 pt-1 pb-2 text-[12.5px] text-(--ap-faint)">{s.provider.hint}</p> : null}
      {s.loading && s.flat.length > 0 ? <p className="px-3 pt-1 pb-2 text-[12px] text-(--ap-faint)">Loading more...</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop / tablet field                                              */
/* ------------------------------------------------------------------ */

export function GlobalSearch({ provider, className = "max-w-[420px]" }: { provider: SearchProvider; className?: string }) {
  const s = useGlobalSearch(provider);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Ctrl+K and "/" focus the field (only while this field is on screen; on phones the header icon handles it).
  const { openPanel, closePanel, open, openCommands } = s;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const visible = !!root.current && root.current.getClientRects().length > 0;
      if (!visible) return;
      if (e.key.toLowerCase() === "p" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        input.current?.focus();
        openCommands();
        return;
      }
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target))) {
        e.preventDefault();
        input.current?.focus();
        openPanel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openPanel, openCommands]);

  // Click outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) closePanel();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, closePanel]);

  return (
    <div ref={root} role="search" onKeyDown={s.onEscapeKey} className={`relative min-w-0 flex-1 ${className}`}>
      <div className="flex h-11 items-center gap-2.5 rounded-xl border border-(--ap-line) bg-(--ap-surface) px-3.5 text-(--ap-muted) focus-within:border-(--ap-violet)">
        <Search className="size-4.5 shrink-0" aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={provider.label}
          aria-expanded={s.open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={s.open ? s.activeId : undefined}
          value={s.query}
          onChange={(e) => s.setQuery(e.target.value)}
          onFocus={s.openPanel}
          onClick={s.openPanel}
          onKeyDown={s.onKeyDown}
          placeholder={provider.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-w-0 border-0 bg-transparent text-sm text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
        />
        {s.query ? (
          <button type="button" aria-label="Clear search" onClick={() => { s.setQuery(""); input.current?.focus(); }} className="flex size-6 shrink-0 items-center justify-center rounded-full text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-(--ap-line) px-1.5 py-0.5 text-[11px] font-semibold text-(--ap-faint) min-[1101px]:inline">Ctrl K</kbd>
        )}
      </div>
      {s.open ? (
        <div className={`absolute top-[calc(100%+8px)] left-0 ${Z} flex w-[min(640px,calc(100vw-3rem))] flex-col overflow-hidden rounded-[14px] border border-(--ap-line) bg-(--ap-surface) shadow-[0_12px_32px_rgba(60,30,80,.14)]`}>
          <Results s={s} listId={listId} onClear={() => { s.setQuery(""); input.current?.focus(); }} className="max-h-[min(66vh,540px)] min-h-0 overflow-y-auto overscroll-contain p-1.5" />
          <DeskFooter />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone header icon + full-screen sheet                               */
/* ------------------------------------------------------------------ */

/** Phone sheet body: recent pills + quick tiles before searching, grouped premium rows after. */
function PhoneResults({ s, listId, onClear }: { s: GlobalSearchController; listId: string; onClear: () => void }) {
  const idle = s.settled === "" && !s.commandMode;
  const quickSec = s.sections.find((x) => x.key === "actions-empty");
  const quickActions = (quickSec?.rows ?? []).flatMap((r) => (r.kind === "action" ? [r.action] : []));
  const quickMore = quickSec?.rows.find((r) => r.kind === "more");
  const recentRows = (s.sections.find((x) => x.key === "recent")?.rows ?? []).flatMap((r) => (r.kind === "recent" ? [r] : []));
  const showChips = s.chips.length > 0 && !s.submitting;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
      {showChips ? (
        <div className="sticky top-0 z-10 -mx-[18px] bg-(--ap-surface) py-2.5">
          <PhoneChips chips={s.chips} value={s.type} onPick={s.setChip} />
        </div>
      ) : null}
      {s.type && !s.searching ? <p className="px-1 pt-3 text-[15px] text-(--ap-muted)">Searching in {s.typeLabel}. Type to narrow it down.</p> : null}
      {s.submitting ? <PhoneSpinner /> : null}
      {s.awaitingEnter ? <EnterHint /> : null}
      {s.loading && s.flat.length === 0 && !s.submitting ? <Skeleton /> : null}
      <div hidden={s.submitting}>
        {s.failed ? (
          <Note title="Search is not available right now">
            Try again in a moment.{" "}
            <button type="button" onClick={s.retry} className="font-bold text-(--ap-violet)">
              Try again
            </button>
          </Note>
        ) : null}
        {s.noResults ? <PhoneNoResults term={s.term} onClear={onClear} /> : null}
        {s.noActions ? <Note title={`No action called "${s.query.replace(/^\s*>\s*/, "")}"`}>Try a simpler word, like new, add or open.</Note> : null}
        {s.tooShort && s.sections.every((x) => x.key === "fallback") ? <Note title="Keep typing">Type at least {MIN_QUERY} letters to search everything.</Note> : null}

        {idle && !s.awaitingEnter ? (
          <>
            <RecentPills items={recentRows.map((r) => r.title)} onPick={(t) => { const row = recentRows.find((r) => r.title === t); if (row) s.choose(row); }} onRemove={s.removeRecent} onClear={s.clearRecent} />
            <QuickTiles actions={quickActions} onPick={(a) => { const row = quickSec?.rows.find((r) => r.kind === "action" && r.action.id === a.id); if (row) s.choose(row); }} onMore={quickMore ? () => s.choose(quickMore) : undefined} />
            <PhoneBrowse pages={s.provider.shortcuts} onPick={(p) => s.choose({ kind: "item", id: p.id, title: p.title, icon: p.icon, href: p.href, terms: "" })} />
            <p className="mt-6 px-1 text-[15px] leading-snug text-(--ap-muted)">{s.provider.hint}</p>
          </>
        ) : null}

        <ul id={listId} role="listbox" aria-label="Search results" className="m-0 list-none p-0">
          {(idle ? [] : s.sections).map((sec) => (
            <li key={sec.key} role="presentation">
              {sec.label ? <PhoneGroupHeading label={sec.label} count={sec.icon && sec.key !== "actions" ? sec.count : undefined} /> : null}
              <ul role="presentation" className="m-0 list-none p-0">
                {sec.rows.map((row) => {
                  const active = s.activeId === `gs-${row.id}`;
                  return (
                    <li key={row.id} role="presentation">
                      {row.kind === "item" ? (
                        row.id === "seeall" || row.id === "fallback" ? (
                          <PhoneLinkRow id={row.id} title={row.title} icon={row.icon} active={active} onPick={() => s.choose(row)} />
                        ) : (
                          <PhoneResultRow row={row} active={active} onPick={() => s.choose(row)} />
                        )
                      ) : row.kind === "action" ? (
                        <button type="button" id={`gs-${row.id}`} role="option" aria-selected={active} onClick={() => s.choose(row)} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-(--ap-line-2) ${active ? "bg-(--ap-line-2)" : ""}`}>
                          <ResultLead title={row.action.title} icon={row.action.icon} />
                          <span className="min-w-0 flex-1 leading-tight">
                            <b className="block truncate text-[16px] font-semibold text-(--ap-ink)">{row.action.title}</b>
                            <span className="mt-0.5 block truncate text-[14px] text-(--ap-muted)">{row.action.category}</span>
                          </span>
                        </button>
                      ) : row.kind === "more" ? (
                        <PhoneMoreRow id={row.id} label="Show more" active={active} onPick={() => s.choose(row)} />
                      ) : (
                        <RecentRow id={row.id} title={row.title} active={active} onPick={() => s.choose(row)} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {s.loading && s.flat.length > 0 ? <p className="px-1 pt-2 text-[14px] text-(--ap-faint)">Loading more...</p> : null}
      </div>
    </div>
  );
}

export function GlobalSearchButton({ provider, themeClass = "", className = "", buttonLabel }: { provider: SearchProvider; themeClass?: string; className?: string; buttonLabel?: string }) {
  const s = useGlobalSearch(provider, undefined, 5);
  const isClient = useIsClient();
  const btn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { open, openPanel, closePanel } = s;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const visible = !!btn.current && btn.current.getClientRects().length > 0;
      if (!visible) return;
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        openPanel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openPanel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const r = requestAnimationFrame(() => input.current?.focus());
    return () => {
      cancelAnimationFrame(r);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" onClick={openPanel} aria-haspopup="dialog" aria-label={buttonLabel ?? provider.label} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2) min-[768px]:hidden ${className}`}>
        <Search className="size-6" aria-hidden="true" />
      </button>
      {isClient && open
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label={provider.label} onKeyDown={s.onEscapeKey} className={`${themeClass} fixed inset-0 ${Z} flex flex-col bg-(--ap-surface) text-(--ap-ink) min-[768px]:hidden`}>
              <div className="flex shrink-0 items-center gap-1 pt-[calc(10px+env(safe-area-inset-top,0px))] pr-[18px] pb-3 pl-2">
                <button type="button" onClick={closePanel} aria-label="Close search" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-ink)">
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <div className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-(--ap-line) bg-(--ap-surface) px-4 text-(--ap-muted) shadow-(--ap-shadow) focus-within:border-(--ap-violet)">
                  <Search className="size-4.5 shrink-0" aria-hidden="true" />
                  <input
                    ref={input}
                    type="text"
                    role="combobox"
                    aria-label={provider.label}
                    aria-expanded
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={s.activeId}
                    value={s.query}
                    onChange={(e) => s.setQuery(e.target.value)}
                    onKeyDown={s.onKeyDown}
                    placeholder={provider.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    className="w-full min-w-0 border-0 bg-transparent text-[16px] text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
                  />
                  {s.query ? (
                    <button type="button" aria-label="Clear search" onClick={() => { s.setQuery(""); input.current?.focus(); }} className="flex size-7 shrink-0 items-center justify-center rounded-full text-(--ap-muted)">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              <PhoneResults s={s} listId={listId} onClear={() => { s.setQuery(""); input.current?.focus(); }} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
