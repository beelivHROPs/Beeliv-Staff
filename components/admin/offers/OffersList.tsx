"use client";

/**
 * Offers list (HR, spec 6.5 / 23.4). Tabs follow the offer lifecycle. Layout
 * reflows by the CONTAINER's width: a table when there is room, stacked cards
 * otherwise. Search, filters and tab live in the URL. Footer is the shared
 * ShowMore (no pagers). Offers are created from an applicant's record or here.
 *
 * Reused: PageHeading / EmptyState / FilterTabs (applicant), SearchField +
 * FilterSelect (client records-filters), StatusChip, ErrorPanel, RowMenu,
 * AdminAvatar, AttentionBadge, ShowMore, Vacancies Restricted.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Award, Plus } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ANY, BODY_ROW, CARD_ITEM, CARD_LIST, ListCard, ListToolbar, NoResults, TABLE_CARD, TH, type FilterDef } from "@/components/admin/listKit";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOffers } from "@/lib/admin/offers/hooks";
import type { OfferQuery, OfferRow, OfferTab } from "@/lib/admin/offers/types";
import { applicantRecordHref, formatYmd, isTab, NEW_OFFER_HREF, offerEditHref, offerHref, TAB_LABEL, TAB_ORDER } from "./meta";
import { OfferStatusChip, Restricted } from "./parts";

const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

export function OffersList() {
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const query: OfferQuery = { search: url.get("q"), tab: isTab(rawTab) ? rawTab : "all", clientId: url.get("client"), vacancyId: url.get("vacancy") };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);

  const live = useOffers(query);
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
    url.set({ q: undefined, tab: undefined, client: undefined, vacancy: undefined });
  };
  const clearFilters = () => {
    setLimit(SHOW_MORE_STEP);
    url.set({ tab: undefined, client: undefined, vacancy: undefined });
  };
  const filterDefs: FilterDef[] = [
    { key: "client", label: "Client", value: query.clientId || ANY, onChange: (v) => setFilter("client", v), options: withAny("All clients", (page?.facets.clients ?? []).map((c) => ({ value: c.id, label: c.name }))) },
    { key: "vacancy", label: "Vacancy", value: query.vacancyId || ANY, onChange: (v) => setFilter("vacancy", v), options: withAny("All vacancies", (page?.facets.vacancies ?? []).map((c) => ({ value: c.id, label: c.name }))) },
  ];
  const narrowed = !!(query.search || query.clientId || query.vacancyId);

  const heading = (right?: React.ReactNode) => <PageHeading title="Offers" right={right} />;

  if (live.status === "error") {
    return (
      <>
        {heading()}
        <ErrorPanel title="We could not load the offers" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading()}
        <Restricted what="Offers" />
      </>
    );
  }
  if (!page) return <ListSkeleton />;

  const newButton = page.canCreate ? (
    <Link href={NEW_OFFER_HREF} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> New offer
    </Link>
  ) : undefined;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading(newButton)}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Award} title="No offers yet" description="Create an offer from an applicant's record once they are selected. Operations approves it before it can be sent." action={newButton} />
        </div>
      </>
    );
  }

  const shownRows = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  const menuFor = (r: OfferRow) => (
    <RowMenu
      label={`Actions for the ${r.applicant.name} offer`}
      items={[
        { label: "View offer", href: offerHref(r.id) },
        ...(r.status === "draft" ? [{ label: "Edit draft", href: offerEditHref(r.id) }] : []),
        { label: "View applicant", href: applicantRecordHref(r.applicant.id) },
      ]}
    />
  );

  return (
    <div>
      {heading(newButton)}

      <ListCard flat title="Offers" summary={`${page.total} ${page.total === 1 ? "offer" : "offers"}${narrowed || query.tab !== "all" ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter offers by lifecycle"
        tabs={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t], count: page.tabCounts[t] }))}
        tab={query.tab}
        onTab={(k: OfferTab) => {
          setLimit(SHOW_MORE_STEP);
          url.set({ tab: k === "all" ? undefined : k });
        }}
        search={{ value: searchText, onChange: onSearch, label: "Search offers", placeholder: "Search applicant, vacancy, client or outlet" }}
        groups={[{ key: "who-where", title: "Who / Where", filters: filterDefs }]}
        tabChipLabel="Status"
        onClearFilters={clearFilters}
        resultCount={page.total}
        sort={null}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          narrowed || query.tab !== "all" ? (
            <NoResults
              noun="offers"
              filters={filterDefs}
              search={query.search}
              onClearSearch={() => {
                setSearchText("");
                setLimit(SHOW_MORE_STEP);
                url.set({ q: undefined });
              }}
              tab={query.tab !== "all" ? { label: "Status", text: TAB_LABEL[query.tab], onRemove: () => url.set({ tab: undefined }) } : null}
              onClear={clearAll}
            />
          ) : (
            <div className="py-6">
              <EmptyState icon={Award} title="No offers in this view" description="Offers appear here as they are created." />
            </div>
          )
        ) : (
          <>
            <OfferTable rows={shownRows} menuFor={menuFor} />
            <OfferCards rows={shownRows} menuFor={menuFor} />
          </>
        )}
      </div>

      <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed || query.tab !== "all" ? clearAll : null} />
      </ListCard>
    </div>
  );
}

const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_40px]";

/** Desktop and tablet: names and titles wrap instead of ending in an ellipsis; the reference joins the role line. Phones keep the one-line truncation. */
const WRAP = "min-[768px]:overflow-visible min-[768px]:text-clip min-[768px]:whitespace-normal min-[768px]:[overflow-wrap:anywhere]";

function ApplicantCell({ r, detail }: { r: OfferRow; detail?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AdminAvatar name={r.applicant.name} photoUrl={r.applicant.photoUrl} size={40} />
      <div className="min-w-0 flex-1 leading-tight">
        <Link href={offerHref(r.id)} className={`block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet) ${WRAP}`}>
          {r.applicant.name}
        </Link>
        <span className={`mt-0.5 block truncate text-[13px] text-(--ap-muted) ${WRAP}`} title={r.role === r.vacancy ? r.role : `${r.role} · ${r.vacancy}`}>
          {detail ?? (r.role === r.vacancy ? r.role : `${r.role} · ${r.vacancy}`)}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint) min-[768px]:hidden" title={r.reference}>
          {r.reference}
        </span>
      </div>
      {r.needsAttention ? <AttentionBadge className="size-5 shrink-0" halo={false} /> : null}
    </div>
  );
}

function OfferTable({ rows, menuFor }: { rows: OfferRow[]; menuFor: (r: OfferRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Offers" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[860px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 rounded-t-xl border-b border-(--ap-line-2) bg-(--ap-surface) px-4 py-3`}>
        <span role="columnheader" className={TH}>Applicant</span>
        <span role="columnheader" className={TH}>Client and outlet</span>
        <span role="columnheader" className={TH}>Status</span>
        <span role="columnheader" className="sr-only">Actions</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-14 px-4 py-2.5 first:border-t-0`}>
          <div role="cell" className="min-w-0">
            <ApplicantCell r={r} />
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <b className="block text-[14px] [overflow-wrap:anywhere]">{r.client}</b>
            <span className="mt-0.5 block text-[13px] [overflow-wrap:anywhere] text-(--ap-muted)">{r.outlet}</span>
          </div>
          <div role="cell" className="min-w-0">
            <OfferStatusChip status={r.status} />
            <span className="mt-1 block text-[12px] text-(--ap-muted)">
              Starts {formatYmd(r.startDate)}
              {r.expiresAt ? ` · respond by ${formatYmd(r.expiresAt)}` : ""}
            </span>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function OfferCards({ rows, menuFor }: { rows: OfferRow[]; menuFor: (r: OfferRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <ApplicantCell r={r} detail={r.expiresAt ? `${r.role} · Respond by ${formatYmd(r.expiresAt)}` : `${r.role} · Starts ${formatYmd(r.startDate)}`} />
            </div>
            <OfferStatusChip status={r.status} />
            {menuFor(r)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading offers">
      <PageHeading title="Offers" />
      <div className={`${sk} mb-3 h-12`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${sk} h-[84px]`} />
        ))}
      </div>
    </div>
  );
}
