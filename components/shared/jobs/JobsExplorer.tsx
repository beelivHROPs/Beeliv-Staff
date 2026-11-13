"use client";

/**
 * The ONE jobs search + filters + list experience, used by the Applicant "Find Jobs" page
 * (components/applicant/JobsBody.tsx) and the public /jobs page (components/public/jobs/PublicJobsExplorer.tsx).
 * Everything below the page hero lives here: phone search card, quick chips, funnel button, desktop search bar,
 * sticky filter sidebar, All/Saved tabs, count + sort, active-filter chips, the list of cards, empty states and
 * the filters sheet. What differs per page is passed in: how a card is drawn (`renderCard`), which ids count as
 * saved, and the job-alert pieces (`alert`). Filter state and logic: components/applicant/jobs/filters.ts.
 * The root must sit inside `.applicant-shell` or `.jc-public` (both provide the colour tokens and button styles).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bookmark, Check, Funnel, Search, X } from "@/components/applicant/icons";
import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { EmptyState } from "@/components/applicant/primitives";
import { FilterBody, LocationSelect, SCH } from "@/components/applicant/jobs/FilterBody";
import { FiltersSheet } from "@/components/applicant/jobs/FiltersSheet";
import { FilterTabs } from "@/components/applicant/FilterTabs";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { SPRING_SOFT } from "@/components/applicant/motion";
import { SEARCH_FEEL_MS } from "@/lib/ui/search-feel";
import { AnimatePresence, motion } from "motion/react";
import {
  EMPTY_FILTERS,
  LIST_SEARCH_KEY,
  activeChips,
  activeFilterCount,
  alertCriteria,
  applyFilters,
  filtersToSearch,
  type JobFilters,
  type ListKey,
  type Sort,
} from "@/components/applicant/jobs/filters";

export type AlertCtx = { criteria: string[]; matchCount: number; newThisWeek: number };

/** The job-alert pieces differ by page (the app has a real alert; the public site points to sign-up). */
export type AlertSlots = {
  /** One-line bar on phones. `open` opens the sheet (if the page has one). */
  strip: (open: () => void) => ReactNode;
  /** Sidebar card (desktop) / stacked card (tablet). */
  card: (ctx: AlertCtx & { className: string }) => ReactNode;
  /** Optional phone sheet holding the full alert controls. */
  sheet?: (ctx: AlertCtx & { open: boolean; onOpenChange: (o: boolean) => void; container: HTMLElement | null }) => ReactNode;
};

export function JobsExplorer({
  jobs,
  initialFilters,
  initialSaved,
  savedIds,
  renderCard,
  alert,
  className,
}: {
  jobs: Job[];
  initialFilters: JobFilters;
  initialSaved: boolean;
  savedIds: string[];
  renderCard: (job: Job) => ReactNode;
  alert: AlertSlots;
  className?: string;
}) {
  const [filters, setFilters] = useState<JobFilters>(initialFilters);
  const [savedView, setSavedView] = useState(initialSaved);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [shell, setShell] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setShell(rootRef.current?.closest<HTMLElement>(".applicant-shell, .jc-public") ?? null);
  }, []);

  // Phone Home's big search entry links here with ?focus=1: put the cursor in the phone search box (runs before the URL below is rewritten).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("focus") !== "1") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    document.getElementById("jq-m")?.focus();
  }, []);

  // Keep the URL in step (shareable, and Back from a job lands on the same view).
  useEffect(() => {
    const search = filtersToSearch(filters, savedView);
    try {
      window.sessionStorage.setItem(LIST_SEARCH_KEY, search);
    } catch {
      // sessionStorage unavailable - the job page falls back to the plain list link.
    }
    const next = `${window.location.pathname}${search}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", next);
  }, [filters, savedView]);

  const savedJobs = useMemo(() => jobs.filter((j) => savedIds.includes(j.id)), [jobs, savedIds]);
  // Prototype: results settle a moment after the last change, with a spinner in between (lib/ui/search-feel.ts).
  // What people type is not searched until they press Enter (or Search); filters and sort settle after the same short wait.
  // Arriving with a search already typed (the Home hero, a quick link) counts as pressing Enter: spinner first, then the results.
  const [settled, setSettled] = useState<JobFilters>(() => (initialFilters.q ? { ...initialFilters, q: "" } : initialFilters));
  const [submitted, setSubmitted] = useState(initialFilters.q ? 1 : 0);
  const [handled, setHandled] = useState(0);
  const target = useMemo(() => ({ ...filters, q: submitted !== handled ? filters.q : settled.q }), [filters, submitted, handled, settled.q]);
  const searching = JSON.stringify(target) !== JSON.stringify(settled);
  useEffect(() => {
    if (!searching && submitted === handled) return;
    // Enter pressed on text that is already applied: nothing to wait for, just mark it handled.
    const t = window.setTimeout(() => {
      if (searching) setSettled(target);
      setHandled(submitted);
    }, searching ? SEARCH_FEEL_MS : 0);
    return () => window.clearTimeout(t);
  }, [searching, target, submitted, handled]);
  const allMatches = useMemo(() => applyFilters(jobs, settled), [jobs, settled]);
  const list = useMemo(() => (savedView ? applyFilters(savedJobs, settled) : allMatches), [savedView, savedJobs, allMatches, settled]);
  const newThisWeek = allMatches.filter((j) => j.daysAgo < 7).length;

  // Phones: when a search or filter leaves nothing, bring "No roles match" into view so nobody has to scroll to find out.
  const noMatchRef = useRef<HTMLDivElement>(null);
  const noMatch = !searching && list.length === 0 && !(savedView && savedJobs.length === 0);
  useEffect(() => {
    if (!noMatch || typeof window === "undefined" || window.innerWidth >= 768) return;
    const el = noMatchRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [noMatch]);
  const nf = activeFilterCount(filters);
  const chips = activeChips(filters);
  const ctx: AlertCtx = { criteria: alertCriteria(filters), matchCount: allMatches.length, newThisWeek };

  function toggle(key: ListKey, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  }
  const setLoc = (loc: string) => setFilters((f) => ({ ...f, loc }));
  const setPosted = (posted: string) => setFilters((f) => ({ ...f, posted }));
  // Wireframe data-clear: resets search + filters, keeps the chosen sort.
  const clearAll = () => {
    setFilters((f) => ({ ...EMPTY_FILTERS, sort: f.sort }));
    setSubmitted((n) => n + 1);
  };

  return (
    <div ref={rootRef} className={className}>
      {/* Phones: one compact search card, quick chips and a one-line alert bar (full filters and alert controls open in sheets). */}
      <div className="mb-4 flex flex-col gap-3 min-[768px]:hidden">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted((n) => n + 1);
            (document.activeElement as HTMLElement | null)?.blur();
          }}
          className="rounded-[18px] border border-(--ap-line) bg-white shadow-(--ap-shadow)"
        >
          <label htmlFor="jq-m" className="flex h-[52px] items-center gap-3 px-4">
            <Search className="size-5 shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />
            <span className="sr-only">Search roles</span>
            <input
              id="jq-m"
              type="search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Role, skill or company"
              autoComplete="off"
              className="w-full min-w-0 border-0 bg-transparent text-base text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
            />
          </label>
          <div className="border-t border-(--ap-line-2) p-1.5">
            <LocationSelect id="jl-m" value={filters.loc} onChange={setLoc} />
          </div>
        </form>

        <div className="ap-scrollbar-none -mx-[18px] flex gap-2 overflow-x-auto px-[18px] max-[380px]:-mx-3.5 max-[380px]:px-3.5" role="group" aria-label="Quick filters">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={nf ? `Filters, ${nf} active` : "Filters"}
            className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--ap-line) bg-white text-(--ap-ink)"
          >
            <Funnel className="size-5" strokeWidth={1.7} aria-hidden="true" />
            {nf ? <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--ap-violet) px-1 text-[12px] font-bold text-white tabular-nums">{nf}</span> : null}
          </button>
          {(
            [
              ["type", "Full-time"],
              ["exp", "Entry level"],
              ["dept", "Kitchen"],
            ] as const
          ).map(([key, value]) => {
            const on = filters[key].includes(value);
            return (
              <button
                key={key + value}
                type="button"
                onClick={() => toggle(key, value)}
                aria-pressed={on}
                className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white text-(--ap-ink)"}`}
              >
                {on ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : <span aria-hidden="true">+</span>}
                {value}
              </button>
            );
          })}
        </div>

        {alert.strip(() => setAlertOpen(true))}
      </div>

      {/* .jsearch */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted((n) => n + 1);
          (document.activeElement as HTMLElement | null)?.blur();
        }}
        className="mb-[22px] grid max-[767px]:hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2.5 rounded-[18px] border border-(--ap-line) bg-white p-2.5 shadow-(--ap-shadow) max-[1040px]:grid-cols-[minmax(0,1fr)_auto_auto] max-[767px]:grid-cols-[minmax(0,1fr)_auto] max-[767px]:gap-2 max-[767px]:rounded-2xl max-[767px]:p-2"
      >
        <label htmlFor="jq" className={`${SCH} max-[767px]:h-12`}>
          <Search className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
          <span className="sr-only">Search roles</span>
          <input
            id="jq"
            type="search"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Role, skill or company"
            autoComplete="off"
            className="w-full min-w-0 border-0 bg-transparent text-base text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
          />
        </label>
        <LocationSelect id="jl" value={filters.loc} onChange={setLoc} className="max-[1040px]:hidden" />
        <button
          type="button"
          aria-label={nf ? `Filters, ${nf} applied` : "Filters"}
          title="Filters"
          onClick={() => setSheetOpen(true)}
          className="ap-btn ap-btn-s px-[18px] min-[1041px]:hidden max-[767px]:px-3.5"
        >
          <Funnel className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          {nf ? <span className="inline-flex h-[22px] items-center rounded-full bg-[#F8F3FA] px-2 text-[13px] font-semibold text-(--ap-violet) tabular-nums">{nf}</span> : null}
        </button>
        <button type="submit" className="ap-btn ap-btn-p px-[26px] max-[767px]:hidden">
          Search
        </button>
      </form>

      {/* .jgrid */}
      <div className="grid grid-cols-1 items-start gap-6 min-[1041px]:grid-cols-[260px_minmax(0,1fr)] min-[1241px]:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-[767px]:hidden min-[1041px]:sticky min-[1041px]:top-[var(--jx-top,88px)] min-[1041px]:max-h-[calc(100dvh/var(--ps-zoom,1)-var(--jx-top,88px)-12px)] min-[1041px]:overflow-y-auto min-[1041px]:pb-1 min-[1041px]:[scrollbar-width:thin]">
          <div className="rounded-[20px] border border-(--ap-line) bg-white p-6 max-[1040px]:hidden min-[1041px]:max-[1100px]:p-[22px]">
            <div className="flex items-baseline justify-between">
              <h2 className="ap-serif m-0 text-[25px]">Filters</h2>
              <button type="button" onClick={clearAll} className="ap-hit text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                Reset all
              </button>
            </div>
            <FilterBody filters={filters} idPrefix="fl" onLocation={setLoc} onPosted={setPosted} onToggle={toggle} />
          </div>
          {alert.card({ ...ctx, className: "mt-4 max-[1040px]:mt-0 max-[1040px]:mb-[18px] max-[767px]:hidden" })}
        </aside>

        <div className="min-w-0">
          {/* All jobs | Saved (project-lead addition, styled as the wireframe's .tabs) */}
          <FilterTabs
            label="Job lists"
            className="mb-3.5"
            value={savedView ? "saved" : "all"}
            onChange={(k) => setSavedView(k === "saved")}
            options={[
              { key: "all", label: "All jobs", count: allMatches.length },
              { key: "saved", label: "Saved jobs", count: savedJobs.length, icon: <Bookmark className="size-[15px]" aria-hidden="true" /> },
            ]}
          />

          {/* .rhead */}
          <div className="mb-3 flex items-center justify-between gap-3 max-[767px]:justify-end">
            <b className="text-lg font-bold tabular-nums max-[767px]:sr-only" aria-live="polite">
              {searching ? (
                "Searching…"
              ) : (
                <>
                  {list.length} {savedView ? "saved " : ""}role{list.length === 1 ? "" : "s"}
                  {savedView ? "" : " available"}
                </>
              )}
            </b>
            <div className="flex items-center gap-2.5 text-sm text-(--ap-muted)">
              <span className="max-[767px]:sr-only">Sort</span>
              <SelectMenu
                id="js"
                label="Sort jobs"
                variant="compact"
                className="max-[767px]:h-12!"
                align="right"
                value={filters.sort}
                onChange={(v) => setFilters((f) => ({ ...f, sort: v as Sort }))}
                options={[
                  { value: "recent", label: "Most recent" },
                  { value: "pay", label: "Pay listed first" },
                ]}
              />
            </div>
          </div>

          {/* .achips */}
          {chips.length ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <span
                  key={`${c.key}|${c.value}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(91,8,123,.08)] py-0 pr-1.5 pl-3 text-sm font-bold text-(--ap-violet)"
                >
                  {c.label}
                  <button
                    type="button"
                    onClick={() => (c.key === "loc" ? setLoc("") : c.key === "posted" ? setPosted("") : toggle(c.key, c.value))}
                    aria-label={`Remove ${c.label}`}
                    className="inline-flex size-[26px] items-center justify-center rounded-full hover:bg-[rgba(91,8,123,.12)]"
                  >
                    <X className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={clearAll} className="min-h-9 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                Clear all
              </button>
            </div>
          ) : null}

          {searching ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-[20px] border border-(--ap-line) bg-white px-6 py-14 text-(--ap-muted) max-[767px]:rounded-[18px]">
              <svg viewBox="0 0 24 24" className="size-8 animate-spin text-(--ap-violet) motion-reduce:animate-none" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-[15px] font-semibold">Searching roles</span>
            </div>
          ) : list.length ? (
            <div className="flex flex-col">
              {/* Unsaving in Saved jobs (or changing filters): leaving cards fold
                  away and the rest glide up; entering cards rise in, staggered. */}
              <AnimatePresence initial={false}>
                {list.map((job, i) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { ...SPRING_SOFT, delay: Math.min(i, 6) * 0.045 } }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden", transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } }}
                    transition={SPRING_SOFT}
                    className="mb-3.5 last:mb-0"
                  >
                    {renderCard(job)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : savedView && savedJobs.length === 0 ? (
            <div className="rounded-[20px] border border-(--ap-line) bg-white p-6 max-[767px]:rounded-[18px] max-[767px]:px-[18px] max-[767px]:py-5">
              <EmptyState
                glass="saved"
                icon={Bookmark}
                title="No saved jobs yet"
                description="Tap the bookmark on any role to keep it here. Saved roles stay on this device until you remove them."
                action={
                  <button type="button" onClick={() => setSavedView(false)} className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
                    Browse jobs
                  </button>
                }
              />
            </div>
          ) : (
            <div ref={noMatchRef} className="scroll-mb-24 rounded-[20px] border border-(--ap-line) bg-white p-6 max-[767px]:rounded-[18px] max-[767px]:px-[18px] max-[767px]:py-5">
              <EmptyState
                glass="search"
                icon={Search}
                title={savedView ? "No saved roles match these filters" : "No roles match these filters"}
                description="Try removing a filter or searching a different role."
                action={
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
                    Clear filters
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {alert.sheet?.({ ...ctx, open: alertOpen, onOpenChange: setAlertOpen, container: shell })}

      <FiltersSheet open={sheetOpen} onOpenChange={setSheetOpen} container={shell} onReset={clearAll} resultCount={list.length}>
        <FilterBody filters={filters} idPrefix="fs" onLocation={setLoc} onPosted={setPosted} onToggle={toggle} />
      </FiltersSheet>
    </div>
  );
}
