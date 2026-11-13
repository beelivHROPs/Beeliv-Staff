"use client";

/**
 * Operations approvals queue. Tabs: Waiting / Approved / Sent back. One clean
 * table (applicant, request, status, chevron); the WHOLE ROW opens the detail
 * (the shared `ad-clickrow` + RowClick pattern, name is the real link, so
 * keyboard and new-tab work). Search, filters and tab live in the URL so Home
 * counts can link straight to a filtered list. Layout reflows by container
 * width. States: loading, empty, nothing-in-tab, error, restricted.
 *
 * Reused: PageHeading / EmptyState, ListCard / ListToolbar and row classes
 * (listKit, read only), ErrorPanel, AdminAvatar, ShowMore, StatusChip.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { PhoneHero } from "@/components/admin/PhoneHero";
import { NotchCard } from "@/components/shared/premium/NotchCard";
import { ANY, BODY_ROW, CARD_LIST, HEAD_ROW, ListToolbar, TABLE_CARD, TH } from "@/components/admin/listKit";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { ChevronRight, CircleAlert, FileCheck2, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useApprovals } from "@/lib/admin/ops/hooks";
import type { ApprovalQuery, ApprovalRow, ApprovalTab } from "@/lib/admin/ops/types";
import { timeAgo } from "@/lib/client/format";
import { approvalHref, isKind, isTab, TAB_LABEL, TAB_ORDER, waitingText } from "./meta";
import { ApprovalStatusChip, KindChip, OpsOnly, Restricted } from "./parts";

const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];
const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1fr)_24px]";

export function ApprovalsList() {
  return (
    <OpsOnly what="Approvals" fallback={<Skeleton />}>
      <div className="ops-calm"><ApprovalsListInner /></div>
    </OpsOnly>
  );
}

function ApprovalsListInner() {
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const rawKind = url.get("type");
  const query: ApprovalQuery = { search: url.get("q"), tab: isTab(rawTab) ? rawTab : "waiting", kind: isKind(rawKind) ? rawKind : "", clientId: url.get("client") };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);

  const live = useApprovals(query);
  const [last, setLast] = useState<typeof live.data>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const page = live.data ?? last;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    setLimit(SHOW_MORE_STEP);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };
  const setFilter = (key: string, v: string) => {
    setLimit(SHOW_MORE_STEP);
    url.set({ [key]: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    setLimit(SHOW_MORE_STEP);
    url.set({ q: undefined, type: undefined, client: undefined });
  };
  const narrowed = !!(query.search || query.kind || query.clientId);

  const heading = <PageHeading title="Approvals" />;

  if (live.status === "error") {
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load the approvals" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading}
        <Restricted what="Approvals" />
      </>
    );
  }
  if (!page) return <Skeleton />;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <div className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-6">
          <EmptyState icon={FileCheck2} title="Nothing to approve yet" description="When HR submits a selection or an offer, it appears here for you to decide." />
        </div>
      </>
    );
  }

  const shown = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  const tabIsFiltered = narrowed;

  return (
    <div>
      {heading}
      <section className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-4 max-[767px]:flex max-[767px]:flex-col max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 min-[768px]:p-5">
        <p className="mb-3 text-[13px] text-(--ap-muted) max-[767px]:mt-4 max-[767px]:mb-2 max-[767px]:px-1 max-[767px]:font-semibold max-[767px]:text-(--ap-ink-2)">{`${page.total} ${page.total === 1 ? "request" : "requests"}${narrowed ? " match your filters" : ""}`}</p>
        <ListToolbar
          phoneTop={<PhoneHero hero="Waiting for you" figure={page.tabCounts.waiting} unit="waiting" line="Open one to approve or send back" />}
          tabsLabel="Filter approvals by status"
          tabs={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t], count: page.tabCounts[t] }))}
          tab={query.tab}
          onTab={(k: ApprovalTab) => {
            setLimit(SHOW_MORE_STEP);
            url.set({ tab: k === "waiting" ? undefined : k });
          }}
          search={{ value: searchText, onChange: onSearch, label: "Search approvals", placeholder: "Search applicant, role, client or outlet" }}
          filters={[
            { key: "type", label: "Type", value: query.kind || ANY, onChange: (v) => setFilter("type", v), options: withAny("Selections and offers", [{ value: "selection", label: "Selections" }, { value: "offer", label: "Offers" }]) },
            { key: "client", label: "Client", value: query.clientId || ANY, onChange: (v) => setFilter("client", v), options: withAny("All clients", page.facets.clients.map((c) => ({ value: c.id, label: c.name }))) },
          ]}
          sort={null}
        />

        <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {page.total === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={tabIsFiltered ? Search : CircleAlert}
                title={tabIsFiltered ? "No requests match these filters" : query.tab === "waiting" ? "You are all caught up" : `Nothing in ${TAB_LABEL[query.tab]} yet`}
                description={tabIsFiltered ? "Check the spelling, or clear a filter." : query.tab === "waiting" ? "Nothing is waiting for your decision." : "Requests you decide appear here."}
                action={
                  tabIsFiltered ? (
                    <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                      <X className="size-4" aria-hidden="true" /> Clear search and filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <Table rows={shown} tab={query.tab} />
              <Cards rows={shown} />
            </>
          )}
        </div>

        <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed ? clearAll : null} />
      </section>
    </div>
  );
}

/** Third column: how long it has waited, or when it was decided. */
function WhenText({ r }: { r: ApprovalRow }) {
  return <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{r.status === "waiting" ? waitingText(r.submittedAt) : r.decidedAt ? timeAgo(r.decidedAt) : ""}</span>;
}

function ApplicantCell({ r }: { r: ApprovalRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AdminAvatar name={r.applicant.name} photoUrl={r.applicant.photoUrl} size={40} />
      <div className="min-w-0 flex-1 leading-tight">
        <Link href={approvalHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
          {r.applicant.name}
        </Link>
        <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.role}>
          {r.role}
        </span>
      </div>
    </div>
  );
}

function Table({ rows, tab }: { rows: ApprovalRow[]; tab: ApprovalTab }) {
  return (
    <div role="table" aria-label="Approvals" className={`${TABLE_CARD} hidden @min-[760px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Applicant</span>
        <span role="columnheader" className={TH}>Request</span>
        <span role="columnheader" className={TH}>{tab === "waiting" ? "Waiting" : "Decision"}</span>
        <span role="columnheader" className="sr-only">Open</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0">
            <ApplicantCell r={r} />
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <KindChip kind={r.kind} />
            <span className="mt-1 block truncate text-[13px] text-(--ap-muted)" title={`${r.client}, ${r.outlet}`}>
              {r.client}, {r.outlet}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <ApprovalStatusChip status={r.status} />
            <WhenText r={r} />
          </div>
          <div role="cell" aria-hidden="true">
            <ChevronRight className="size-4 text-(--ap-faint)" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows }: { rows: ApprovalRow[] }) {
  return (
    <ul className={`${CARD_LIST} gap-3 @min-[760px]:hidden`}>
      {rows.map((r) => (
        <NotchCard
          key={r.id}
          as="li"
          tone="plain"
          notchSize={64}
          wrap={false}
          badge={
            <span className="flex flex-col items-center leading-none">
              <b className="text-[17px] tabular-nums">{Math.max(0, Math.floor((Date.now() - new Date(r.submittedAt).getTime()) / 86400000))}</b>
              <span className="mt-0.5 text-[9px] font-semibold">days</span>
            </span>
          }
          badgeLabel="Days since submitted"
          bodyClassName="py-3.5 pr-[70px] pl-4"
        >
          <ApplicantCell r={r} />
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <KindChip kind={r.kind} />
            <ApprovalStatusChip status={r.status} />
            <span className="min-w-0 truncate text-[12px] text-(--ap-muted)">
              {r.client}
            </span>
          </div>
        </NotchCard>
      ))}
    </ul>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading approvals">
      <PageHeading title="Approvals" />
      <div className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-5">
        <div className={`${sk} mb-3 h-8 w-72 max-w-full`} />
        <div className={`${sk} mb-4 h-11`} />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${sk} h-[60px]`} />
          ))}
        </div>
      </div>
    </div>
  );
}
