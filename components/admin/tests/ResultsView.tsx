"use client";

/**
 * Results for one test or form. Tests: a table of submissions (person, submitted date and time, status, score and
 * recommendation). Appraisals: a Summary view (counts and averages per question, written answers listed, no scoring)
 * plus the individual responses. Sort by date and time; ShowMore instead of pagers; stacked cards on narrow containers.
 *
 * Reused: listKit (ListCard, ListToolbar, useBatch, table classes), ShowMore, AdminAvatar (viewable), EmptyState,
 * ErrorPanel, StatusChip (via parts), useUrlParams, formatDateTime.
 */
import { useIncreaseSound } from "@/lib/admin/use-increase-sound";
import Link from "next/link";
import { useRef, useState } from "react";
import { FileText, Search, X } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { StarRating } from "@/components/shared/StarRating";
import { formatDateTimeFull } from "@/lib/admin/sort";
import { useResults, useSummary } from "@/lib/admin/tests/hooks";
import type { FormSummary, ResultQuery, ResultSort, ResultsPage, SubmissionRow } from "@/lib/admin/tests/adapter";
import { AUDIENCE_LABEL, BackLink, DetailSkeleton, FormStatusChip, KindChip, RECO_LABEL, Restricted, Section, SubmissionChip, applicantProfileHref, formHref, submissionHref } from "./parts";
import { DETAIL_TITLE } from "@/components/applicant/primitives";

const SORTS: { value: ResultSort; label: string }[] = [
  { value: "newest", label: "Newest first (date and time)" },
  { value: "oldest", label: "Oldest first (date and time)" },
];

export function ResultsView({ formId }: { formId: string }) {
  const url = useUrlParams();
  const sort: ResultSort = url.get("sort") === "oldest" ? "oldest" : "newest";
  const batch = useBatch([url.get("q"), sort].join("|"));
  const query: ResultQuery = { search: url.get("q"), sort, pageSize: batch.limit };
  const live = useResults(formId, query);
  const [shown, setShown] = useState<ResultsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  // A new submission arriving while this page is open (never on first load): cutlery tick.
  useIncreaseSound(page?.submittedTotal, "testCompleted", formId);

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };

  if (live.status === "error") {
    return (
      <>
        <BackLink />
        <ErrorPanel title="We could not load the results" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <BackLink />
        <Restricted what="These results are" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <BackLink />
        <div className={EMPTY_CARD}>
          <EmptyState icon={FileText} title="Results not found" description="This test or form does not exist, or it is outside your access." />
        </div>
      </>
    );
  }
  if (!page) return <DetailSkeleton label="Loading results" />;

  const { form } = page;
  const isTest = form.kind === "test";
  const view = !isTest && url.get("view") !== "responses" ? "summary" : "responses";
  const refreshing = live.status === "loading";
  const filtersActive = !!query.search;
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined });
  };

  return (
    <div>
      <BackLink />
      <header className="ap-card mb-4 rounded-[20px] p-5 min-[768px]:p-6">
        <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{form.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
          <KindChip kind={form.kind} />
          <FormStatusChip status={form.status} />
          <span>Version {form.version}</span>
          <span>For: {AUDIENCE_LABEL[form.audience]}{form.clientName ? ` (${form.clientName})` : ""}</span>
          <span>{page.submittedTotal} submitted</span>
          <Link href={formHref(form.id)} className="font-bold text-(--ap-violet) hover:text-(--ap-plum)">Open the form</Link>
        </div>
        {isTest ? <p className="mt-3 text-[13px] text-(--ap-muted)">A score only helps you decide. It never rejects anyone, and written answers always wait for a person to mark them.</p> : null}
      </header>

      {!isTest ? (
        <div role="group" aria-label="Results view" className="mb-4 flex gap-2">
          <button type="button" className="ap-pick" aria-pressed={view === "summary"} onClick={() => url.set({ view: undefined })}>Summary</button>
          <button type="button" className="ap-pick" aria-pressed={view === "responses"} onClick={() => url.set({ view: "responses" })}>Individual responses</button>
        </div>
      ) : null}

      {view === "summary" ? (
        <SummaryPanel formId={formId} />
      ) : (
        <ListCard title="Submissions" summary={`${page.total} ${page.total === 1 ? "person" : "people"}${filtersActive ? " match your search" : ""}${!filtersActive && page.total > page.submittedTotal ? `, ${page.submittedTotal} submitted and ${page.total - page.submittedTotal} in progress` : ""}`}>
          <ListToolbar
            tabsLabel="Submissions"
            search={{ value: searchText, onChange: onSearch, label: "Search submissions", placeholder: "Search by name" }}
            sort={{ value: sort, options: SORTS, onChange: (v) => url.set({ sort: v === "newest" ? undefined : v }) }}
          />
          <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
            {page.total === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={filtersActive ? Search : FileText}
                  title={filtersActive ? "Nobody matches this search" : "No submissions yet"}
                  description={filtersActive ? "Check the spelling of the name." : "When someone submits this, it appears here."}
                  action={
                    filtersActive ? (
                      <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                        <X className="size-4" aria-hidden="true" /> Clear search
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                <Table formId={formId} rows={page.rows} isTest={isTest} />
                <Cards formId={formId} rows={page.rows} isTest={isTest} />
              </>
            )}
          </div>
          <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filtersActive ? clearAll : null} />
        </ListCard>
      )}
    </div>
  );
}

/* ---------- shared row bits ---------- */

function Person({ r }: { r: SubmissionRow }) {
  const inner = (
    <>
      <AdminAvatar name={r.takerName} size={38} viewable />
      <span className="min-w-0 truncate text-[15px] font-bold">{r.takerName}</span>
    </>
  );
  return (
    <span className="flex min-w-0 items-center gap-3">
      {r.takerType === "applicant" ? (
        <>
          <AdminAvatar name={r.takerName} size={38} viewable />
          <Link href={applicantProfileHref(r.takerId)} className="min-w-0 truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)" title="Open applicant profile">
            {r.takerName}
          </Link>
        </>
      ) : (
        inner
      )}
    </span>
  );
}

function Score({ r }: { r: SubmissionRow }) {
  if (!r.score || r.status === "in-progress") return <span className="text-(--ap-muted)">Not submitted</span>;
  const s = r.score;
  return (
    <span className="block leading-tight">
      <b className="text-[15px] tabular-nums">{s.percent === null ? "Not marked yet" : `${s.percent}%`}</b>
      <span className="block text-[12px] text-(--ap-muted)">
        {s.markedCount} / {s.markableCount} marked, {s.awaitingMarking} waiting
      </span>
    </span>
  );
}

const Reco = ({ r }: { r: SubmissionRow }) => (r.recommendation ? <span>{RECO_LABEL[r.recommendation]}</span> : <span className="text-(--ap-muted)">Not decided</span>);
const When = ({ r }: { r: SubmissionRow }) => <span>{r.submittedAt ? formatDateTimeFull(r.submittedAt) : "Not submitted"}</span>;
const Open = ({ formId, r }: { formId: string; r: SubmissionRow }) => (
  <Link href={submissionHref(formId, r.id)} className="ap-btn ap-btn-s ap-btn-sm" aria-label={`Open ${r.takerName}'s submission`}>
    Open
  </Link>
);

function Table({ formId, rows, isTest }: { formId: string; rows: SubmissionRow[]; isTest: boolean }) {
  const cols = isTest ? "grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_76px]" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_76px]";
  return (
    <div role="table" aria-label="Submissions" className={`${TABLE_CARD} hidden @min-[760px]:block`}>
      <div role="row" className={`grid ${cols} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Person</span>
        <span role="columnheader" className={TH}>Status</span>
        {isTest ? <span role="columnheader" className={TH}>Result</span> : <span role="columnheader" className={TH}>Submitted</span>}
        <span role="columnheader" className="sr-only">Open</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${cols} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0"><Person r={r} /></div>
          <div role="cell" className="min-w-0">
            <SubmissionChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)"><When r={r} /></span>
          </div>
          {isTest ? (
            <div role="cell" className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-semibold tabular-nums"><Score r={r} /></span>
              <span className="mt-0.5 block truncate text-[12px] text-(--ap-muted)"><Reco r={r} /></span>
            </div>
          ) : (
            <span role="cell" className="truncate text-[13px] text-(--ap-ink-2)"><When r={r} /></span>
          )}
          <div role="cell" className="text-right"><Open formId={formId} r={r} /></div>
        </div>
      ))}
    </div>
  );
}

function Cards({ formId, rows, isTest }: { formId: string; rows: SubmissionRow[]; isTest: boolean }) {
  return (
    <ul className={`${CARD_LIST} @min-[760px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><Person r={r} /></div>
            <Open formId={formId} r={r} />
          </div>
          <p className="mt-2 text-[13px] text-(--ap-muted)"><When r={r} /></p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
            <SubmissionChip status={r.status} />
            {isTest ? <Score r={r} /> : null}
            {isTest ? <span>Recommendation: <Reco r={r} /></span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- appraisal summary ---------- */

function SummaryPanel({ formId }: { formId: string }) {
  const live = useSummary(formId);
  if (live.status === "error") return <ErrorPanel title="We could not load the summary" retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="This summary is" />;
  if (!live.data) return <DetailSkeleton label="Loading summary" />;
  const s: FormSummary = live.data;
  if (s.submittedTotal === 0) {
    return (
      <div className={EMPTY_CARD}>
        <EmptyState icon={FileText} title="No responses yet" description="The summary appears once people start submitting this form." />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-(--ap-muted)">
        {s.submittedTotal} {s.submittedTotal === 1 ? "response" : "responses"}. Written answers are shown without names; whether appraisals are anonymous needs Beeliv confirmation.
      </p>
      {s.questions.map((q, i) => (
        <Section key={q.questionId} title={`${i + 1}. ${q.prompt}`} right={<span className="text-[12px] text-(--ap-muted)">{q.answered} answered</span>}>
          {q.counts.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {q.type === "rating" && q.average !== null ? (
                <div className="flex flex-wrap items-center gap-x-3">
                  <StarRating readOnly showValue={false} value={Math.round(q.average)} scale={q.counts.length} label={`Average for ${q.prompt}`} />
                  <p className="text-[15px]">Average: <b>{q.average}</b> out of {q.counts.length}</p>
                </div>
              ) : null}
              {q.counts.map((c) => {
                const pct = q.answered > 0 ? Math.round((c.count / q.answered) * 100) : 0;
                return (
                  <div key={c.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 text-[14px] break-words">{c.label}</span>
                    <span className="text-[13px] text-(--ap-muted) tabular-nums">{c.count} ({pct}%)</span>
                    <span className="col-span-2 block h-2 overflow-hidden rounded-full bg-(--ap-line-2)">
                      <span className="block h-full rounded-full bg-(--ap-violet)" style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : q.type === "short" || q.type === "email" ? (
            <p className="text-[14px] text-(--ap-muted)">Short answers such as names and email addresses are not listed here. Open an individual response to see them.</p>
          ) : q.written.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {q.written.map((w, k) => (
                <li key={`${k}-${w}`} className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-2.5 text-[14px] leading-snug break-words text-(--ap-ink-2)">
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-(--ap-muted)">No answers yet.</p>
          )}
        </Section>
      ))}
    </div>
  );
}
