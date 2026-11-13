"use client";

/**
 * Assessment results (read-only). The Assessment & Testing module is delivered
 * in a later stage; this screen only shows results and RESERVES the data model.
 * Scores never auto-hire or auto-reject. Reused: PageHeading, FilterTabs,
 * Client SearchField/FilterSelect/StatusChip, RowMenu, Initials, EmptyState,
 * ErrorPanel, shared Skeleton/Restricted from interviews/ui.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, FileCheck2, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, TABLE_CARD, TH, useBatch, ListCard, ListToolbar } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { Initials } from "@/components/admin/overview/Sections";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { ListSkeleton, RestrictedPanel } from "@/components/admin/interviews/ui";
import { useAssessments } from "@/lib/admin/assessments/hooks";
import { ASSESSMENT_RECOMMENDATION_LABEL, ASSESSMENT_SORTS, type AssessmentRecommendation, type AssessmentRow, type AssessmentsPage, type AssessmentsQuery, type AssessmentStatus, type AssessmentTab } from "@/lib/admin/assessments/types";

const ANY = "__any";
type Filters = Omit<AssessmentsQuery, "pageSize">;
const BASE: Filters = { search: "", tab: "all", typeId: "", vacancyId: "", sort: "newest", page: 1 };

export const ASSESSMENT_STATUS: Record<AssessmentStatus, { tone: ChipTone; label: string }> = {
  scheduled: { tone: "info", label: "Scheduled" },
  "awaiting-result": { tone: "warn", label: "Awaiting result" },
  completed: { tone: "ok", label: "Completed" },
  cancelled: { tone: "mute", label: "Cancelled" },
};
const REC_TONE: Record<AssessmentRecommendation, ChipTone> = { "meets-standard": "ok", "below-standard": "bad", "needs-retake": "warn" };

export function AssessmentNote() {
  return (
    <div className="ap-card mb-4 rounded-2xl p-4">
      <p className="text-[14px] leading-snug text-(--ap-ink-2)">
        <b>Read-only.</b> The Assessment &amp; Testing module is delivered in a later stage. Results are shown here as a record. A score never hires or rejects anyone: people decide.
      </p>
    </div>
  );
}

export function AssessmentsList() {
  const sp = useSearchParams();
  const [filters, setQuery] = useState<Filters>(() => ({ ...BASE, sort: ASSESSMENT_SORTS.some((o) => o.value === sp.get("sort")) ? (sp.get("sort") as string) : "newest" }));
  const batch = useBatch(JSON.stringify(filters));
  const query: AssessmentsQuery = { ...filters, pageSize: batch.limit };
  const live = useAssessments(query);
  const [shown, setShown] = useState<AssessmentsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  const [searchText, setSearchText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (p: Partial<Filters>) => setQuery((q) => ({ ...q, ...p, page: 1 }));
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ search: v.trim() }), 250);
  };
  const clearAll = () => {
    setSearchText("");
    setQuery((q) => ({ ...BASE, sort: q.sort }));
  };
  const setSort = (v: string) => {
    patch({ sort: v });
    const next = new URLSearchParams(window.location.search);
    if (v === "newest") next.delete("sort");
    else next.set("sort", v);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };

  if (live.status === "restricted") return <RestrictedPanel title="Assessments" what="Assessment results" />;
  if (live.status === "error") {
    return (
      <>
        <PageHeading title="Assessments" />
        <ErrorPanel title="We could not load assessment results" retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Assessments" />;
  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Assessments" />
        <AssessmentNote />
        <div className={EMPTY_CARD}>
          <EmptyState icon={FileCheck2} title="No assessment results yet" description="Practical assessment results show here once candidates have taken one." />
        </div>
      </>
    );
  }

  const anyFilter = !!(query.search || query.typeId || query.vacancyId);
  const refreshing = live.status === "loading";

  return (
    <div>
      <PageHeading title="Assessments" />
      <AssessmentNote />
      <ListCard flat title="Assessment results" summary={`${page.total} ${page.total === 1 ? "assessment" : "assessments"}${anyFilter ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter assessments"
        tabs={[
          { key: "all", label: "All", count: page.tabCounts.all },
          { key: "scheduled", label: "Scheduled", count: page.tabCounts.scheduled },
          { key: "awaiting-result", label: "Awaiting result", count: page.tabCounts["awaiting-result"] },
          { key: "completed", label: "Completed", count: page.tabCounts.completed },
        ]}
        tab={query.tab}
        onTab={(k: AssessmentTab) => patch({ tab: k })}
        search={{ value: searchText, onChange: onSearch, label: "Search assessments", placeholder: "Search candidate, type or evaluator" }}
        filters={[
          { key: "type", label: "Assessment type", value: query.typeId || ANY, onChange: (v) => patch({ typeId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All assessment types" }, ...page.facets.types.map((t) => ({ value: t.id, label: t.name }))] },
          { key: "vacancy", label: "Vacancy", value: query.vacancyId || ANY, onChange: (v) => patch({ vacancyId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All vacancies" }, ...page.facets.vacancies.map((v) => ({ value: v.id, label: v.name }))] },
        ]}
        sort={{ value: query.sort, options: ASSESSMENT_SORTS, onChange: setSort }}
      />
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title="No assessments match"
              description="Nothing matches the search, filters and tab you chose."
              action={
                anyFilter || query.tab !== "all" ? (
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table rows={page.rows} />
            <Cards rows={page.rows} />
          </>
        )}
      </div>
      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={anyFilter ? clearAll : null} />
      </ListCard>
    </div>
  );
}

function Score({ r }: { r: AssessmentRow }) {
  return r.score === null ? <span className="text-[14px] text-(--ap-muted)">No score yet</span> : <span className="text-[14px] font-semibold tabular-nums text-(--ap-ink-2)">{r.score}/{r.maxScore}</span>;
}
function Rec({ r }: { r: AssessmentRow }) {
  return r.recommendation ? <StatusChip tone={REC_TONE[r.recommendation]}>{ASSESSMENT_RECOMMENDATION_LABEL[r.recommendation]}</StatusChip> : <span className="text-[14px] text-(--ap-muted)">Not recorded</span>;
}
const href = (r: AssessmentRow) => `/admin/recruitment/assessments/${r.id}`;

const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_24px]";

function Table({ rows }: { rows: AssessmentRow[] }) {
  return (
    <div role="table" aria-label="Assessment results" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[900px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Candidate</span>
        <span role="columnheader">Assessment</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Result</span>
        <span role="columnheader" className="sr-only">
          Open
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={r.candidateName} size="size-10" />
            <div className="min-w-0 leading-tight">
              <Link href={href(r)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.candidateName}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.vacancy}>
                {r.vacancy}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] text-(--ap-ink-2)" title={r.typeName}>
              {r.typeName}
            </span>
            {r.at ? <span className="mt-0.5 block truncate text-[12px] text-(--ap-muted)">{formatDateTime(r.at)}</span> : null}
          </div>
          <div role="cell" className="min-w-0">
            <StatusChip tone={ASSESSMENT_STATUS[r.status].tone}>{ASSESSMENT_STATUS[r.status].label}</StatusChip>
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{r.evaluator?.name ?? "Not assigned"}</span>
          </div>
          <div role="cell" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Score r={r} />
            {r.recommendation ? <Rec r={r} /> : null}
          </div>
          <span role="cell" className="text-(--ap-faint)">
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows }: { rows: AssessmentRow[] }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[900px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <Initials name={r.candidateName} size="size-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={href(r)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.candidateName}
              </Link>
              <span className="block truncate text-[13px] text-(--ap-muted)" title={`${r.typeName}, ${r.vacancy}`}>
                {r.typeName}, {r.vacancy}
              </span>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusChip tone={ASSESSMENT_STATUS[r.status].tone}>{ASSESSMENT_STATUS[r.status].label}</StatusChip>
            <Score r={r} />
            {r.recommendation ? <Rec r={r} /> : null}
          </div>
          <p className="mt-1.5 truncate text-[12px] text-(--ap-muted)">Evaluator: {r.evaluator?.name ?? "Not assigned"}</p>
        </li>
      ))}
    </ul>
  );
}
