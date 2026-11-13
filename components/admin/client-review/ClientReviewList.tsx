"use client";

/**
 * Client Review list (HR, spec 6.5 / 14). HR submits shortlisted candidates to
 * the client and follows the client's feedback. The client's answer informs
 * Beeliv; HR never approves selection here (Operations does, REC-001).
 * Layout reflows by the CONTAINER's width: a table when there is room, stacked
 * cards otherwise. Filters and the tab live in the URL.
 *
 * Reused: PageHeading / EmptyState, FilterTabs, Client SearchField +
 * FilterSelect + StatusChip, RowMenu, AdminAvatar, AttentionBadge, ErrorPanel,
 * ShowMore, vacancies Restricted, useUrlParams.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ANY, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListSkeleton, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { Restricted } from "@/components/admin/vacancies/parts";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Search, UsersRound, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useClientReviews } from "@/lib/admin/client-review/hooks";
import { TAB_LABEL, TAB_ORDER, type ClientReviewPage, type ClientReviewQuery, type ClientReviewRow, type ReviewTab } from "@/lib/admin/client-review/types";
import { applicantHref } from "@/lib/admin/links";
import { clientReviewHref, daysText, ReviewChip, submittedOn } from "./meta";

const isTab = (v: string): v is ReviewTab => (TAB_ORDER as string[]).includes(v);
const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

export function ClientReviewList() {
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const batch = useBatch(`${url.get("q")}|${url.get("tab")}|${url.get("client")}|${url.get("vacancy")}`);
  const query: ClientReviewQuery = { search: url.get("q"), tab: isTab(rawTab) ? rawTab : "ready", clientId: url.get("client"), vacancyId: url.get("vacancy"), limit: batch.limit };

  const live = useClientReviews(query);
  const [shown, setShown] = useState<ClientReviewPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patch = (p: Record<string, string | undefined>) => {
    url.set(p);
  };
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ q: v.trim() || undefined }), 250);
  };
  const setFilter = (key: string, v: string) => patch({ [key]: v === ANY ? undefined : v });
  const clearAll = () => {
    setSearchText("");
    patch({ q: undefined, client: undefined, vacancy: undefined });
  };
  const anyFilter = !!(query.search || query.clientId || query.vacancyId);

  if (live.status === "restricted") {
    return (
      <>
        <PageHeading title="Client Review" />
        <Restricted what="Client Review" />
      </>
    );
  }
  if (live.status === "error") {
    return (
      <>
        <PageHeading title="Client Review" />
        <ErrorPanel title="We could not load Client Review" retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Client Review" label="Loading Client Review" />;

  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Client Review" />
        <div className={EMPTY_CARD}>
          <EmptyState
            icon={UsersRound}
            title="Nothing has gone to a client yet"
            description="Shortlisted candidates the client needs to see appear here, ready to submit. The client's feedback shows here once it arrives."
            action={
              <Link href="/admin/recruitment/shortlisting" className="ap-btn ap-btn-s ap-btn-sm">
                Go to Shortlisting
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const refreshing = live.status === "loading";
  const menuFor = (r: ClientReviewRow) => (
    <div className="flex items-center justify-end gap-2" data-no-row>
      <Link href={clientReviewHref(r.id)} className={`ap-btn ${r.status === "ready" ? "ap-btn-p text-white!" : "ap-btn-s"} ap-btn-sm whitespace-nowrap`}>
        {r.status === "ready" ? "Review" : "View"}
      </Link>
    <RowMenu
      label={`Actions for ${r.candidateName}, ${r.vacancy}`}
      items={[
        { label: "View applicant", href: applicantHref(r.applicantId) },
      ]}
    />
    </div>
  );

  return (
    <div>
      <PageHeading title="Client Review" />

      <ListCard flat title="Client Review" summary={`${page.total} ${page.total === 1 ? "submission" : "submissions"}${anyFilter ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter Client Review by stage"
        tabs={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t], count: page.tabCounts[t] }))}
        tab={query.tab}
        onTab={(k: ReviewTab) => patch({ tab: k === "ready" ? undefined : k })}
        search={{ value: searchText, onChange: onSearch, label: "Search Client Review", placeholder: "Search candidate or vacancy" }}
        filters={[
          { key: "client", label: "Client", value: query.clientId || ANY, onChange: (v) => setFilter("client", v), options: withAny("All clients", page.facets.clients.map((c) => ({ value: c.id, label: c.name }))) },
          { key: "vacancy", label: "Vacancy", value: query.vacancyId || ANY, onChange: (v) => setFilter("vacancy", v), options: withAny("All vacancies", page.facets.vacancies.map((v) => ({ value: v.id, label: v.name }))) },
        ]}
        sort={null}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className={EMPTY_CARD}>
            <EmptyState
              icon={Search}
              title={anyFilter ? "No submissions match these filters" : `Nothing in ${TAB_LABEL[query.tab]}`}
              description={anyFilter ? "Check the spelling, or try fewer filters." : "Submissions with this status show here."}
              action={
                anyFilter ? (
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

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={anyFilter ? clearAll : null} />
      </ListCard>
    </div>
  );
}

/* ---------- bits ---------- */

function Waiting({ r }: { r: ClientReviewRow }) {
  if (r.daysWaiting === null) return <span className="text-[13px] text-(--ap-muted)">Not waiting</span>;
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] ${r.overdue ? "font-semibold text-(--ap-ink)" : "text-(--ap-ink-2)"}`}>
      {r.overdue ? <AttentionBadge className="size-5" halo={false} /> : null}
      {daysText(r.daysWaiting)}
      {r.overdue ? <span className="sr-only"> overdue</span> : null}
    </span>
  );
}

function Next({ r }: { r: ClientReviewRow }) {
  if (!r.nextAction) return <span className="text-[13px] text-(--ap-muted)">Nothing waiting</span>;
  return (
    <span className="block truncate text-[13px] font-semibold text-(--ap-ink-2)" title={r.nextAction}>
      {r.nextAction}
    </span>
  );
}

const clientText = (r: ClientReviewRow) => (r.outlet && r.outlet !== r.client ? `${r.client}, ${r.outlet}` : r.client);

function Who({ r, size }: { r: ClientReviewRow; size: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AdminAvatar name={r.candidateName} photoUrl={r.photoUrl} size={size} />
      <div className="min-w-0 leading-tight">
        <Link href={clientReviewHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
          {r.candidateName}
        </Link>
        <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.vacancy}>
          {r.vacancy}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={clientText(r)}>
          {clientText(r)}
        </span>
      </div>
    </div>
  );
}

const COLS = "grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_132px]";

function Table({ rows, menuFor }: { rows: ClientReviewRow[]; menuFor: (r: ClientReviewRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Client Review" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Candidate</span>
        <span role="columnheader">Client decision</span>
        <span role="columnheader">Next action</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0">
            <Who r={r} size={40} />
          </div>
          <div role="cell" className="min-w-0">
            <ReviewChip status={r.status} decision={r.decision} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">
              {r.submittedAt ? `Submitted ${submittedOn(r.submittedAt)}` : "Not yet submitted"}
              {r.recordedByHr ? " · Recorded by HR" : ""}
            </span>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <Next r={r} />
            <div className="mt-1">
              <Waiting r={r} />
            </div>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, menuFor }: { rows: ClientReviewRow[]; menuFor: (r: ClientReviewRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Who r={r} size={40} />
            </div>
            {menuFor(r)}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ReviewChip status={r.status} decision={r.decision} />
            <span className="min-w-0 truncate text-[12px] text-(--ap-muted)">
              {r.submittedAt ? `Submitted ${submittedOn(r.submittedAt)}` : "Not yet submitted"}
              {r.recordedByHr ? " · Recorded by HR" : ""}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Next r={r} />
            <Waiting r={r} />
          </div>
        </li>
      ))}
    </ul>
  );
}
