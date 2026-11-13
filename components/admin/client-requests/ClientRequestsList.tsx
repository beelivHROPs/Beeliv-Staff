"use client";

/**
 * Client Requests queue (HR, spec 14 / 28.1 "Workforce requests"). Staff
 * requests sent by clients from the Client app. HR assigns, acknowledges,
 * links or creates a vacancy, and closes them. Nothing here publishes a
 * vacancy. Layout reflows by the CONTAINER's width: table when there is room,
 * stacked cards otherwise. Filters and the tab live in the URL.
 *
 * Reused: PageHeading / EmptyState, FilterTabs, Client SearchField +
 * FilterSelect + StatusChip, RowMenu, AttentionBadge, ErrorPanel, ShowMore,
 * vacancies Restricted, useUrlParams, Client Review list skeleton.
 */
import { useCan } from "@/lib/admin/role-access";
import Link from "next/link";
import { useRef, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ANY, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListSkeleton, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { Restricted } from "@/components/admin/vacancies/parts";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { FileText, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useClientRequests } from "@/lib/admin/client-requests/hooks";
import { TAB_LABEL, TAB_ORDER, type RequestRow, type RequestsPage, type RequestsQuery, type RequestTab } from "@/lib/admin/client-requests/types";
import { clientText, createVacancyHref, requestHref, RequestStatusChip, vacancyHref, ymdText } from "./meta";

const isTab = (v: string): v is RequestTab => (TAB_ORDER as string[]).includes(v);
const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

export function ClientRequestsList() {
  const canCreateVacancy = useCan("vacancy.create");
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const batch = useBatch(`${url.get("q")}|${url.get("tab")}|${url.get("client")}|${url.get("vacancy")}`);
  const query: RequestsQuery = { search: url.get("q"), tab: isTab(rawTab) ? rawTab : "new", clientId: url.get("client"), limit: batch.limit };

  const live = useClientRequests(query);
  const [shown, setShown] = useState<RequestsPage | null>(null);
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
  const clearAll = () => {
    setSearchText("");
    patch({ q: undefined, client: undefined });
  };
  const anyFilter = !!(query.search || query.clientId);

  if (live.status === "restricted") {
    return (
      <>
        <PageHeading title="Client Requests" />
        <Restricted what="Client Requests" />
      </>
    );
  }
  if (live.status === "error") {
    return (
      <>
        <PageHeading title="Client Requests" />
        <ErrorPanel title="We could not load Client Requests" retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Client Requests" label="Loading Client Requests" />;

  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Client Requests" />
        <div className={EMPTY_CARD}>
          <EmptyState icon={FileText} title="No staff requests yet" description="When a client asks for staff from their app, the request shows here for HR to pick up." />
        </div>
      </>
    );
  }

  const refreshing = live.status === "loading";
  const menuFor = (r: RequestRow) => (
    <div className="flex items-center justify-end gap-2" data-no-row>
      <Link href={requestHref(r.id)} className={`ap-btn ${r.status === "new" ? "ap-btn-p text-white!" : "ap-btn-s"} ap-btn-sm whitespace-nowrap`}>
        {r.status === "new" ? "Review" : "View"}
      </Link>
    <RowMenu
      label={`Actions for ${r.role}, ${r.client}`}
      items={[
        ...(r.linkedVacancy ? [{ label: "View linked vacancy", href: vacancyHref(r.linkedVacancy.id) }] : canCreateVacancy ? [{ label: "Create vacancy", href: createVacancyHref(r.id) }] : []),
      ]}
    />
    </div>
  );

  return (
    <div>
      <PageHeading title="Client Requests" />

      <ListCard title="Client Requests" summary={`${page.total} ${page.total === 1 ? "request" : "requests"}${anyFilter ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter Client Requests by status"
        tabs={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t], count: page.tabCounts[t] }))}
        tab={query.tab}
        onTab={(k: RequestTab) => patch({ tab: k === "new" ? undefined : k })}
        search={{ value: searchText, onChange: onSearch, label: "Search Client Requests", placeholder: "Search role, client or reference" }}
        filters={[{ key: "client", label: "Client", value: query.clientId || ANY, onChange: (v) => patch({ client: v === ANY ? undefined : v }), options: withAny("All clients", page.facets.clients.map((c) => ({ value: c.id, label: c.name }))) }]}
        sort={null}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title={anyFilter ? "No requests match these filters" : `Nothing in ${TAB_LABEL[query.tab]}`}
              description={anyFilter ? "Check the spelling, or try fewer filters." : "Requests with this status show here."}
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

function Title({ r }: { r: RequestRow }) {
  return (
    <div className="min-w-0 leading-tight">
      <Link href={requestHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
        {r.role} <span className="font-semibold text-(--ap-muted)">x {r.headcount}</span>
      </Link>
      <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={clientText(r)}>
        {clientText(r)}
      </span>
      <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={r.reference}>
        {r.reference}
      </span>
    </div>
  );
}

function Status({ r }: { r: RequestRow }) {
  return (
    <div className="min-w-0">
      <RequestStatusChip status={r.status} />
      {r.nextAction ? (
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-(--ap-muted)" title={r.nextAction}>
          {r.needsAttention ? <AttentionBadge className="size-4 shrink-0" halo={false} /> : null}
          <span className="truncate">{r.nextAction}</span>
        </span>
      ) : null}
    </div>
  );
}

function Vacancy({ r }: { r: RequestRow }) {
  if (!r.linkedVacancy) return <span className="text-[13px] text-(--ap-muted)">No vacancy linked</span>;
  return (
    <Link href={vacancyHref(r.linkedVacancy.id)} className="block truncate text-[13px] font-semibold text-(--ap-violet) hover:text-(--ap-plum)" title={r.linkedVacancy.title}>
      {r.linkedVacancy.title}
    </Link>
  );
}

const COLS = "grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_132px]";

function Table({ rows, menuFor }: { rows: RequestRow[]; menuFor: (r: RequestRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Client Requests" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Request</span>
        <span role="columnheader">Needed by</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0">
            <Title r={r} />
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] text-(--ap-ink-2)">{ymdText(r.neededBy)}</span>
            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.reason}>
              {r.reason}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">HR: {r.assignedTo?.name ?? "Unassigned"}</span>
          </div>
          <div role="cell" className="min-w-0">
            <Status r={r} />
            <div className="mt-1 min-w-0">
              <Vacancy r={r} />
            </div>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, menuFor }: { rows: RequestRow[]; menuFor: (r: RequestRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Title r={r} />
            </div>
            <span className="shrink-0 min-[768px]:hidden">
              <RequestStatusChip status={r.status} />
            </span>
            <span className="max-[767px]:hidden">{menuFor(r)}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="max-[767px]:hidden">
              <RequestStatusChip status={r.status} />
            </span>
            <span className="min-w-0 truncate text-[13px] text-(--ap-muted)">
              Needed {ymdText(r.neededBy)}
              <span className="max-[767px]:hidden"> · {r.reason} · HR: {r.assignedTo?.name ?? "Unassigned"}</span>
            </span>
          </div>
          <div className="mt-1.5 min-w-0 max-[767px]:hidden">
            <Vacancy r={r} />
          </div>
        </li>
      ))}
    </ul>
  );
}
