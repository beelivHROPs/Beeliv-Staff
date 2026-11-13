"use client";

/**
 * Interviews (HR, spec 6.4 / 14): list (default) and a calendar-style week
 * view. Stages are DATA from the adapter (configurable), never hard-coded
 * columns. Scores and recommendations are shown beside, never instead of, the
 * human outcome. HR schedules and records; it does not approve selection.
 * Reused: PageHeading, FilterTabs, Client FilterSelect/SearchField/StatusChip,
 * RowMenu, Initials, AttentionBadge, EmptyState, ErrorPanel, RelativeTime.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, FileText, Plus, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, TABLE_CARD, TH, useBatch, ListCard, ListToolbar, ListTabs } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { RowMenu, type RowMenuItem } from "@/components/admin/overview/RowMenu";
import { Initials } from "@/components/admin/overview/Sections";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { applicantHref } from "@/lib/admin/links";
import { useInterviews } from "@/lib/admin/interviews/hooks";
import { INTERVIEW_SORTS, METHOD_LABEL, type InterviewRow, type InterviewsPage, type InterviewsQuery, type InterviewTab } from "@/lib/admin/interviews/types";
import { InterviewDialogs, type Intent } from "./InterviewDialogs";
import { addDays, InterviewWeek, mondayOf, weekRange } from "./InterviewWeek";
import { InterviewStatusChip, ListSkeleton, NoticeBanner, RecommendationChip, RestrictedPanel, type Notice } from "./ui";

const ANY = "__any";
type Filters = Omit<InterviewsQuery, "pageSize">;
const BASE: Filters = { search: "", tab: "all", stageId: "", vacancyId: "", interviewerId: "", range: null, sort: "soonest", page: 1 };

/** Overview drill-through uses ?status=pending. Which tab "pending" means needs Beeliv confirmation: the fixture uses Upcoming. */
function tabFromParam(v: string | null): InterviewTab {
  if (v === "pending" || v === "upcoming") return "upcoming";
  if (v === "to-schedule" || v === "needs-outcome" || v === "completed") return v;
  return "all";
}

export function InterviewsList() {
  const sp = useSearchParams();
  const [view, setView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [filters, setFilters] = useState<Filters>(() => ({ ...BASE, tab: tabFromParam(sp.get("status")), sort: INTERVIEW_SORTS.some((o) => o.value === sp.get("sort")) ? (sp.get("sort") as string) : "soonest" }));
  const batch = useBatch(JSON.stringify(filters));
  const query: InterviewsQuery = view === "week" ? { ...filters, tab: "all", range: weekRange(weekStart), page: 1, pageSize: 200 } : { ...filters, pageSize: batch.limit };
  const live = useInterviews(query);
  const [shown, setShown] = useState<InterviewsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Arriving from the Calendar's "Schedule interview" button (?schedule=1) opens the pop-up straight away.
  const [intent, setIntent] = useState<Intent | null>(() => (sp.get("schedule") === "1" ? { kind: "schedule", row: null } : null));
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    if (next.get("schedule") !== "1") return;
    next.delete("schedule");
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);
  const [notice, setNotice] = useState<Notice | null>(null);

  const patch = (p: Partial<Filters>) => setFilters((q) => ({ ...q, ...p, page: 1 }));
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ search: v.trim() }), 250);
  };
  const clearAll = () => {
    setSearchText("");
    setFilters((q) => ({ ...BASE, sort: q.sort }));
  };
  const setSort = (v: string) => {
    patch({ sort: v });
    const next = new URLSearchParams(window.location.search);
    if (v === "soonest") next.delete("sort");
    else next.set("sort", v);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const anyFilter = !!(filters.search || filters.stageId || filters.vacancyId || filters.interviewerId);

  if (live.status === "restricted") return <RestrictedPanel title="Interviews" what="Interviews" />;
  if (live.status === "error") {
    return (
      <>
        <PageHeading title="Interviews" />
        <ErrorPanel title="We could not load interviews" retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Interviews" />;

  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Interviews" />
        <ScopeNote />
        <ScopeGate>
        <div className={EMPTY_CARD}>
          <EmptyState
            icon={Calendar}
            title="No interviews yet"
            description="When a shortlisted applicant reaches an interview stage, it shows here to schedule and score."
            action={
              <Link href="/admin/recruitment/shortlisting" className="ap-btn ap-btn-s ap-btn-sm">
                Go to Shortlisting
              </Link>
            }
          />
        </div>
        </ScopeGate>
      </>
    );
  }

  const refreshing = live.status === "loading";
  const interviewers = page.facets.interviewers;
  const menuFor = (r: InterviewRow) => {
    const items: RowMenuItem[] = [{ label: "View interview", href: `/admin/recruitment/interviews/${r.id}` }, { label: "View applicant", href: applicantHref(r.applicantId) }];
    if (r.status === "to-schedule") items.push({ label: "Schedule", onSelect: () => setIntent({ kind: "schedule", row: r }) });
    if (r.status === "scheduled" || r.status === "cancelled") items.push({ label: "Reschedule", onSelect: () => setIntent({ kind: "reschedule", row: r }) });
    if (r.status === "scheduled") items.push({ label: "Cancel interview", tone: "danger", onSelect: () => setIntent({ kind: "cancel", row: r }) });
    return <RowMenu label={`Actions for ${r.candidateName}, ${r.stageName}`} items={items} />;
  };

  return (
    <div>
      <PageHeading
        title="Interviews"
        right={
          <button type="button" onClick={() => setIntent({ kind: "schedule", row: null })} disabled={page.schedulable.length === 0} title={page.schedulable.length === 0 ? "No one is waiting to be scheduled" : undefined} className="ap-btn ap-btn-p h-11 text-white!">
            <Plus className="size-4" aria-hidden="true" /> Schedule interview
          </button>
        }
      />
      <ScopeNote />
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <ListCard flat title="Interviews" summary={`${page.total} ${page.total === 1 ? "interview" : "interviews"}${anyFilter ? " match your filters" : ""}`}>
        <ListToolbar
          tabsLabel="Filter interviews"
          before={<div className="max-[767px]:hidden"><ListTabs<"list" | "week"> label="Choose a view" tabs={[{ key: "list", label: "List" }, { key: "week", label: "Week" }]} value={view} onChange={setView} /></div>}
          tabs={
            view === "list"
              ? [
                  { key: "all", label: "All", count: page.tabCounts.all },
                  { key: "to-schedule", label: "To schedule", count: page.tabCounts["to-schedule"] },
                  { key: "upcoming", label: "Upcoming", count: page.tabCounts.upcoming },
                  { key: "needs-outcome", label: "Needs outcome", count: page.tabCounts["needs-outcome"] },
                  { key: "completed", label: "Completed", count: page.tabCounts.completed },
                ]
              : undefined
          }
          tab={filters.tab}
          onTab={(k: InterviewTab) => patch({ tab: k })}
          search={{ value: searchText, onChange: onSearch, label: "Search interviews", placeholder: "Search interviews" }}
          filters={[
            { key: "stage", label: "Stage", value: filters.stageId || ANY, onChange: (v) => patch({ stageId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All stages" }, ...page.facets.stages.map((s) => ({ value: s.id, label: s.name }))] },
            { key: "vacancy", label: "Vacancy", value: filters.vacancyId || ANY, onChange: (v) => patch({ vacancyId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All vacancies" }, ...page.facets.vacancies.map((v) => ({ value: v.id, label: v.name }))] },
            { key: "interviewer", label: "Interviewer", value: filters.interviewerId || ANY, onChange: (v) => patch({ interviewerId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All interviewers" }, ...interviewers.map((p) => ({ value: p.id, label: p.name }))] },
          ]}
          sort={{ value: filters.sort, options: INTERVIEW_SORTS, onChange: setSort }}
        />
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {view === "week" ? (
          <InterviewWeek rows={page.rows} weekStart={weekStart} onShift={(n) => setWeekStart((w) => addDays(w, 7 * n))} onToday={() => setWeekStart(mondayOf(new Date()))} />
        ) : page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title={anyFilter ? "No interviews match" : "No interviews in this list"}
              description={anyFilter ? "Nothing matches the search and filters you chose. Try fewer filters." : "Interviews with this status show here."}
              action={
                anyFilter || filters.tab !== "all" ? (
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table rows={page.rows} menuFor={menuFor} />
            <Cards rows={page.rows} menuFor={menuFor} />
          </>
        )}
      </div>

      {view === "list" ? <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={anyFilter ? clearAll : null} /> : null}
      </ListCard>

      {intent ? (
        <InterviewDialogs
          key={`${intent.kind}-${intent.row?.id ?? "new"}`}
          intent={intent}
          interviewers={interviewers}
          schedulable={page.schedulable}
          onClose={() => setIntent(null)}
          onSaved={(_d, text, sound) => {
            setIntent(null);
            setNotice({ kind: "ok", text, sound });
            live.retry();
          }}
          onFailed={(text) => {
            setIntent(null);
            setNotice({ kind: "error", text });
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- bits ---------- */

function Schedule({ r }: { r: InterviewRow }) {
  if (!r.at) return <span className="text-[14px] text-(--ap-muted)">Not scheduled</span>;
  return (
    <div className="min-w-0 leading-tight">
      <span className="block truncate text-[14px] text-(--ap-ink-2)">{formatDateTime(r.at)}</span>
      {r.method ? <span className="mt-0.5 block truncate text-[12px] text-(--ap-muted)">{METHOD_LABEL[r.method]}</span> : null}
    </div>
  );
}

/** Score (guide only) with the recommendation chip beside it. */
function Score({ r }: { r: InterviewRow }) {
  if (r.totalScore === null) return <span className="text-[14px] text-(--ap-muted)">No score yet</span>;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[14px] font-semibold tabular-nums text-(--ap-ink-2)" title="Guide only. The recommendation is the human decision.">
        {r.totalScore}/{r.maxScore}
      </span>
      <RecommendationChip rec={r.recommendation} />
    </div>
  );
}

function Next({ r }: { r: InterviewRow }) {
  if (!r.nextAction) return <span className="text-[13px] text-(--ap-muted)">Nothing waiting</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-(--ap-ink-2)" title={r.nextAction}>
      {r.needsAttention ? <span aria-label="Needs attention" className="ap-dot-attn" /> : null}
      <span className="truncate">{r.nextAction}</span>
    </span>
  );
}

const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_40px]";

function Table({ rows, menuFor }: { rows: InterviewRow[]; menuFor: (r: InterviewRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Interviews" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[900px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Candidate</span>
        <span role="columnheader">Schedule</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Outcome</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={r.candidateName} size="size-10" />
            <div className="min-w-0 leading-tight">
              <Link href={`/admin/recruitment/interviews/${r.id}`} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.candidateName}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${r.vacancy} · ${r.stageName}`}>
                {r.vacancy} · {r.stageName}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0">
            <Schedule r={r} />
          </div>
          <div role="cell" className="min-w-0">
            <InterviewStatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{r.interviewer?.name ?? "Not assigned"}</span>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <Score r={r} />
            <div className="mt-1 min-w-0">
              <Next r={r} />
            </div>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, menuFor }: { rows: InterviewRow[]; menuFor: (r: InterviewRow) => React.ReactNode }) {
  return (
    <div className="@min-[900px]:hidden">
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <Initials name={r.candidateName} size="size-9" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={`/admin/recruitment/interviews/${r.id}`} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.candidateName}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${r.vacancy}, ${r.stageName}`}>
                {r.at ? formatDateTime(r.at) : "Not scheduled"} · {r.stageName}
              </span>
            </div>
            <span className="shrink-0"><InterviewStatusChip status={r.status} /></span>
            <span className="max-[767px]:hidden">{menuFor(r)}</span>
          </div>
        </li>
      ))}
    </ul>
    <p className="mt-3 flex items-center gap-1.5 text-[12px] text-(--ap-faint) max-[767px]:hidden">
      <FileText className="size-3.5 shrink-0" aria-hidden="true" /> Scores guide the decision. They never decide it.
    </p>
    </div>
  );
}
