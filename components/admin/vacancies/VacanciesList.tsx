"use client";

/**
 * Vacancies list (HR, spec 14 / 15). Layout reflows by the CONTAINER's width: a
 * real table when there is room, stacked cards otherwise (phones, narrow
 * tablets). Search, filters and tabs live in the URL so Overview drill-through
 * links (e.g. ?status=published) and reloads land on the same list.
 *
 * Reused: PageHeading / EmptyState (applicant primitives), FilterTabs,
 * SelectMenu (via Client records-filters SearchField + FilterSelect), Client
 * StatusChip (via VacancyStatusChip), ErrorPanel, RowMenu, Disc.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { Briefcase, ChevronRight, Clock3, MapPin, Plus } from "@/components/applicant/icons";
import { NotchCard } from "@/components/shared/premium/NotchCard";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { ActiveChips, CARD_LIST, EMPTY_CARD, ListSkeleton, ListTabs, TABLE_CARD, TH, activeFilterChips, useBatch, NoResults, type ActiveChip, type FilterDef } from "@/components/admin/listKit";
import { FilterField, FilterSection, FiltersButton, StatusMark } from "@/components/admin/standard";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ShowMore } from "@/components/admin/ShowMore";
import { PhoneHero } from "@/components/admin/PhoneHero";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { useUrlParams } from "@/components/admin/applicants/url";
import { NEW_VACANCY_HREF } from "@/lib/admin/links";
import { useVacancies } from "@/lib/admin/vacancies/hooks";
import { VACANCY_SORTS, type VacanciesPage, type VacancyQuery, type VacancyRow, type VacancyStatus, type VacancyTab } from "@/lib/admin/vacancies/types";
import { closesText, STATUS_LABEL, STATUS_ORDER, STATUS_TONE, TAB_LABEL, TAB_ORDER } from "./meta";
import { Restricted } from "./parts";

const ANY = "__any";
const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

export const vacancyHref = (id: string) => `/admin/recruitment/vacancies/${id}`;
export const vacancyEditHref = (id: string) => `/admin/recruitment/vacancies/${id}/edit`;
export const vacancyApplicantsHref = (id: string) => `/admin/recruitment/applicants?vacancy=${id}`;

const isStatus = (v: string): v is VacancyStatus => (STATUS_ORDER as string[]).includes(v);
const isTab = (v: string): v is VacancyTab => (TAB_ORDER as string[]).includes(v);

export function VacanciesList() {
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const rawStatus = url.get("status");
  const rawState = url.get("state");
  // The Overview's "Open vacancies" metric links to ?status=published: that means the Open tab (Published + Closing soon).
  const tab: VacancyTab = isTab(rawTab) ? rawTab : rawStatus === "published" ? "open" : "all";
  const sort = VACANCY_SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "newest";
  const batch = useBatch([url.get("q"), tab, rawStatus, rawState, url.get("dept"), url.get("client"), url.get("recruiter"), sort].join("|"));
  const query: VacancyQuery = {
    search: url.get("q"),
    tab,
    status: isStatus(rawState) ? rawState : isStatus(rawStatus) && rawStatus !== "published" ? rawStatus : "",
    department: url.get("dept"),
    clientId: url.get("client"),
    recruiterId: url.get("recruiter"),
    sort,
    page: 1,
    pageSize: batch.limit,
  };

  const live = useVacancies(query);
  const [shown, setShown] = useState<VacanciesPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };
  const setFilter = (key: string, v: string) => url.set({ [key]: v === ANY || v === "" ? undefined : v });
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined, tab: undefined, status: undefined, state: undefined, dept: undefined, client: undefined, recruiter: undefined });
  };
  const clearFilters = () => url.set({ tab: undefined, status: undefined, state: undefined, dept: undefined, client: undefined, recruiter: undefined });
  const filterDefs: FilterDef[] = [
    { key: "dept", control: "select", label: "Department", anyLabel: "All", value: query.department || ANY, onChange: (v) => setFilter("dept", v), options: withAny("All departments", (page?.facets.departments ?? []).map((d) => ({ value: d, label: d }))) },
    { key: "client", control: "select", label: "Client", anyLabel: "All", value: query.clientId || ANY, onChange: (v) => setFilter("client", v), options: withAny("All clients", (page?.facets.clients ?? []).map((c) => ({ value: c.id, label: c.name }))) },
    { key: "recruiter", control: "select", label: "Recruiter", anyLabel: "All", value: query.recruiterId || ANY, onChange: (v) => setFilter("recruiter", v), options: withAny("All recruiters", [...(page?.facets.recruiters ?? []).map((r) => ({ value: r.id, label: r.name })), { value: "none", label: "Unassigned" }]) },
  ];
  const filtersActive = !!(query.search || query.status || query.department || query.clientId || query.recruiterId);
  const anyNarrowing = filtersActive || query.tab !== "all";

  const statusDef: FilterDef = {
    key: "status",
    label: "Status",
    value: query.tab,
    onChange: (v) => url.set({ tab: v === "all" ? undefined : v, status: undefined }),
    options: TAB_ORDER.map((t) => ({ value: t, label: `${TAB_LABEL[t]}${page ? ` ${page.tabCounts[t]}` : ""}` })),
    control: "chips",
  };
  const sortDef: FilterDef = { key: "sort", label: "Sort", value: sort, onChange: (v) => url.set({ sort: v === "newest" ? undefined : v }), options: VACANCY_SORTS, control: "select" };
  const appliedChips: ActiveChip[] = [
    ...activeFilterChips(filterDefs),
  ];
  const activeCount = appliedChips.length;

  const heading = (right?: React.ReactNode) => <PageHeading title="Vacancies" right={<div className="flex flex-wrap gap-3">{process.env.NEXT_PUBLIC_VACANCIES_BACKEND_ENABLED==='true'?<Link href="/admin/recruitment/vacancies/settings" className="ap-btn">Vacancy settings</Link>:null}{right}</div>} />;

  if (live.status === "error") {
    return (
      <>
        {heading()}
        <ErrorPanel title="We could not load the vacancies" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading()}
        <Restricted what="Vacancies" />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Vacancies" label="Loading vacancies" />;

  const newButton = page.capabilities.canCreate ? (
    <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> New vacancy
    </Link>
  ) : undefined;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading(newButton)}
        <div className={EMPTY_CARD}>
          <EmptyState icon={Briefcase} title="No vacancies yet" description="Create a vacancy to start receiving applications. Drafts stay private until they are published." action={newButton} />
        </div>
      </>
    );
  }

  const refreshing = live.status === "loading";

  const menuFor = (r: VacancyRow) => (
    <RowMenu
      label={`Actions for ${r.title}`}
      items={[
        { label: "View vacancy", href: vacancyHref(r.id) },
        ...(page.capabilities.canEdit ? [{ label: "Edit vacancy", href: vacancyEditHref(r.id) }] : []),
        { label: "View applicants", href: vacancyApplicantsHref(r.id) },
      ]}
    />
  );

  return (
    <div>
      {heading(newButton)}

      <section aria-label="Vacancies" data-search-scope className="ap-card min-w-0 rounded-[20px] p-4.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none">
      <div className="contents max-[767px]:mb-4 max-[767px]:block">
      <SearchBar
        search={{ value: searchText, onChange: onSearch, label: "Search vacancies", placeholder: "Search title, client, recruiter or location" }}
        settleKey={[tab, rawStatus, rawState, query.department, query.clientId, query.recruiterId, sort].join("|")}
        filterSlot={
        <FiltersButton active={activeCount} resultCount={page.total} onClear={clearFilters}>
          {({ sheet }) => (
            <>
              {sheet ? null : (
                <FilterSection title="Status">
                  <FilterField f={statusDef} sheet={sheet} />
                </FilterSection>
              )}
              {filterDefs.map((f) => (
                <FilterSection key={f.key} title={f.label} inline>
                  <FilterField f={f} sheet={sheet} />
                </FilterSection>
              ))}
              <FilterSection title="Sort" inline>
                <FilterField f={sortDef} sheet={sheet} />
              </FilterSection>
            </>
          )}
        </FiltersButton>
        }
      />
      {/* Phones: the status pills are the ONE tab row (count inside each tab), straight under the search card. */}
      <div className="mt-3 min-[768px]:hidden [&>div]:mb-0">
        <ListTabs label="Vacancies by status" tabs={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t], count: page.tabCounts[t] }))} value={query.tab} onChange={(t) => url.set({ tab: t === "all" ? undefined : t, status: undefined })} />
      </div>
      <div className="mt-3.5 min-[768px]:hidden">
        <PhoneHero hero="Open vacancies" figure={page.tabCounts.open} unit="open" line={`${page.tabCounts.all} vacancies in total`} side={{ value: page.tabCounts.pending, label: "awaiting approval" }} />
      </div>
      {/* Desktop and tablet: ONE status pill row (All first, count inside each pill). Phones use the tab row above. */}
      <div role="group" aria-label="Vacancies by status" className="ap-scrollbar-none mt-4 mb-6 flex gap-2 overflow-x-auto py-0.5 max-[767px]:hidden">
        {TAB_ORDER.map((t) => {
          const on = query.tab === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => url.set({ tab: t === "all" ? undefined : t, status: undefined })}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:border-(--ap-violet)"}`}
            >
              {TAB_LABEL[t]}
              <span className={`tabular-nums ${on ? "text-white/80" : "text-(--ap-muted)"}`}>{page.tabCounts[t]}</span>
            </button>
          );
        })}
      </div>
      <ActiveChips chips={appliedChips} onClearAll={clearFilters} className="mb-6 max-[767px]:mb-0" />
      </div>
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          anyNarrowing ? (
            <NoResults
              noun="vacancies"
              filters={filterDefs}
              search={query.search}
              onClearSearch={() => {
                setSearchText("");
                url.set({ q: undefined });
              }}
              tab={query.tab !== "all" ? { label: "Status", text: TAB_LABEL[query.tab], onRemove: () => url.set({ tab: undefined, status: undefined, state: undefined }) } : null}
              onClear={clearAll}
            />
          ) : (
            <div className="py-6">
              <EmptyState icon={Briefcase} title="No vacancies in this view" description="There are no vacancies to show yet." />
            </div>
          )
        ) : (
          <>
            <VacancyTable rows={page.rows} menuFor={menuFor} />
            <VacancyCards rows={page.rows} menuFor={menuFor} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filtersActive ? clearAll : null} />
      </section>
    </div>
  );
}

/* ---------- shared bits ---------- */

/* ---------- table (wide containers) ---------- */

const COLS = "grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_36px]";
const HEAD = TH;

/** Status pill tints, from the Admin tokens so dark mode follows: Published mint, Closing soon sand, Filled lavender, Draft rose, the rest grey. */
const MINT = "bg-[color-mix(in_srgb,var(--ap-ok)_14%,transparent)] text-(--ap-ok)";
const SAND = "bg-[color-mix(in_srgb,var(--ap-warn)_14%,transparent)] text-(--ap-warn)";
const LAVENDER = "bg-[color-mix(in_srgb,var(--ap-violet)_12%,transparent)] text-(--ap-violet)";
const ROSE = "bg-[color-mix(in_srgb,var(--ap-rose)_12%,transparent)] text-(--ap-rose)";
const GREY = "bg-(--ap-line-2) text-(--ap-muted)";
const PILL: Record<VacancyStatus, string> = {
  published: MINT,
  "closing-soon": SAND,
  "pending-approval": SAND,
  filled: LAVENDER,
  draft: ROSE,
  paused: GREY,
  closed: GREY,
  cancelled: GREY,
};

/** How far applicants have got, as one thin bar (counts are cumulative: applied >= shortlisted >= interviewed >= placed). */
function Pipeline({ r }: { r: VacancyRow }) {
  if (r.countsReady === false || !r.counts) {
    return <p className="text-[13px] text-(--ap-muted)">Applicant counts unavailable</p>;
  }
  const c = r.counts;
  const total = Math.max(c.applications, 1);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;
  return (
    <div className="min-w-0" title={`${c.applications} applied, ${c.shortlisted} shortlisted, ${c.interviewed} interviewed, ${c.placed} placed`}>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
        <span style={{ width: pct(c.placed) }} className="bg-(--ap-ok)" />
        <span style={{ width: pct(Math.max(c.interviewed - c.placed, 0)) }} className="bg-(--ap-violet)" />
        <span style={{ width: pct(Math.max(c.shortlisted - c.interviewed, 0)) }} className="bg-(--ap-violet-2) opacity-60" />
      </div>
      <p className="mt-1.5 text-[13px] text-(--ap-ink-2)">
        <b className="font-bold text-(--ap-ink)">{c.applications}</b> applied
        <span className="text-(--ap-muted)">
          {" / "}
          {c.shortlisted} shortlisted{c.placed ? ` / ${c.placed} placed` : ""}
        </span>
      </p>
    </div>
  );
}

function VacancyTable({ rows, menuFor }: { rows: VacancyRow[]; menuFor: (r: VacancyRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Vacancies" className={`${TABLE_CARD} hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) min-[768px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 rounded-t-xl border-b border-(--ap-line-2) bg-(--ap-surface) px-4 py-3`}>
        <span role="columnheader" className={HEAD}>Vacancy</span>
        <span role="columnheader" className={HEAD}>Recruiter</span>
        <span role="columnheader" className={HEAD}>Applicants</span>
        <span role="columnheader" className={HEAD}>Status</span>
        <span role="columnheader" className="sr-only">Actions</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ad-clickrow min-h-14 border-t border-(--ap-line-2) px-4 py-2.5 first:border-t-0 hover:bg-(--ap-tint-soft)`}>
          <div role="cell" className="min-w-0 leading-tight">
            <Link href={vacancyHref(r.id)} className="block text-[15px] font-bold [overflow-wrap:anywhere] text-(--ap-ink) hover:text-(--ap-violet)">
              {r.title}
            </Link>
            <span className="mt-0.5 block text-[13px] leading-snug [overflow-wrap:anywhere] text-(--ap-muted)">
              {r.client.name}
              {r.outlet ? `, ${r.outlet.name}` : ""} · {r.openings} {r.openings === 1 ? "opening" : "openings"}
            </span>
          </div>
          <div role="cell" className="flex min-w-0 items-center gap-2 text-[14px] text-(--ap-ink-2)">
            {r.recruiter ? (
              <>
                <AdminAvatar name={r.recruiter.name} size={28} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{r.recruiter.name}</span>
              </>
            ) : (
              <span className="text-(--ap-muted)">Unassigned</span>
            )}
          </div>
          <div role="cell" className="min-w-0">
            <Pipeline r={r} />
          </div>
          <div role="cell" className="min-w-0">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap ${PILL[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            <span className="mt-1 block text-[12px] text-(--ap-muted)">{closesText(r)}</span>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- stacked cards (phones, narrow containers) ---------- */

function VacancyCards({ rows }: { rows: VacancyRow[]; menuFor?: (r: VacancyRow) => React.ReactNode }) {
  // Phone card (approved mid-ground + project-lead card spec): top row (tile, title, client), status pill, up to three facts,
  // thin progress bar (placed of openings), footer with the applicant count and a View link. The notch keeps the applicants count.
  return (
    <ul className={`${CARD_LIST} gap-3 min-[768px]:hidden`}>
      {rows.map((r) => {
        const apps = r.countsReady === false || !r.counts ? null : r.counts.applications;
        const placed = r.counts?.placed ?? 0;
        const facts = [
          { key: "loc", Icon: MapPin, text: r.location },
          { key: "type", Icon: Briefcase, text: r.employmentType },
          { key: "close", Icon: Clock3, text: closesText(r) },
        ].filter((f) => f.text);
        return (
          <li key={r.id} className="ad-vcard relative [filter:drop-shadow(0_8px_12px_rgba(60,30,80,.08))]">
            <NotchCard as="div" tone="plain" outlined={false} notchSize={64} wrap={false} badge={<b className="text-[17px] tabular-nums">{apps ?? "-"}</b>} badgeLabel="Applicants" bodyClassName="p-4">
              <div className="flex items-start gap-3 pr-[52px]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-(--ap-tint) text-(--ap-violet)" aria-hidden="true">
                  <Briefcase className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={vacancyHref(r.id)} className="block text-[16px] leading-[1.25] font-bold [overflow-wrap:anywhere] text-(--ap-ink) after:absolute after:inset-0 after:z-[2] after:content-['']">
                    {r.title}
                  </Link>
                  <span className="mt-0.5 block text-[14px] leading-[1.3] font-medium [overflow-wrap:anywhere] text-(--ap-muted)">{r.outlet ? `${r.client.name}, ${r.outlet.name}` : r.client.name}</span>
                </div>
              </div>
              <div className="mt-2.5">
                <StatusMark tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusMark>
              </div>
              {facts.length ? (
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-[13px] text-(--ap-muted)">
                  {facts.map(({ key, Icon, text }) => (
                    <li key={key} className="flex min-w-0 items-start gap-1.5 [overflow-wrap:anywhere]">
                      <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      {text}
                    </li>
                  ))}
                </ul>
              ) : null}
              {r.openings > 0 && r.counts ? (
                <div className="mt-3">
                  <div role="img" aria-label={`${placed} of ${r.openings} filled`} className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0e3ea]">
                    <span className="ad-grad block h-full rounded-full" style={{ width: `${Math.min(100, (placed / r.openings) * 100)}%` }} />
                  </div>
                  <p className="m-0 mt-1.5 text-[13px] text-(--ap-muted)">
                    {placed} of {r.openings} filled
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#efeaf3] pt-1 text-[13px] text-(--ap-muted)">
                <span>{apps === null ? "Applicants not available yet" : `${apps} ${apps === 1 ? "applicant" : "applicants"}`}</span>
                <span className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold text-(--ap-violet)" aria-hidden="true">
                  View <ChevronRight className="size-4" />
                </span>
              </div>
            </NotchCard>
          </li>
        );
      })}
    </ul>
  );
}
