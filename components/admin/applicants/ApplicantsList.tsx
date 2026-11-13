"use client";

/**
 * Applicants list (HR, spec 14 / 28.2). One focused row per application:
 * applicant, role + client/outlet, applied, stage, recruiter, next action.
 * Layout reflows by the CONTAINER's width (the sidebar eats viewport width), not
 * the viewport: a real table when there is room, stacked cards otherwise, so
 * nothing is squeezed or clipped from 360px phones to 2560px monitors (the
 * shell caps content width).
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { Users } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, ListSkeleton, TABLE_CARD, TH, useBatch, PhoneScopeSlot, useDeskScope, ActiveChips, activeFilterChips, NoResults, type ActiveChip, type FilterDef } from "@/components/admin/listKit";
import { DeskPills, FilterField, FilterSection, FiltersButton } from "@/components/admin/standard";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { ShowMore } from "@/components/admin/ShowMore";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { formatDateTime } from "@/lib/admin/sort";
import { applicantHref } from "@/lib/admin/links";
import { resolveStageParam, STAGE_TABS } from "@/lib/admin/applicants/filters";import { performApplicantAction, useApplicantsList } from "@/lib/admin/applicants/hooks";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { APPLICANT_SORTS, type ApplicantRow, type ApplicantsPage, type ApplicantsQuery } from "@/lib/admin/applicants/types";
import { InitialsAvatar, StageMark } from "./parts";
import { useUrlParams } from "./url";

const ANY = "__any";
const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

export function ApplicantsList() {
  const url = useUrlParams();
  const deskScope = useDeskScope();
  const resolved = resolveStageParam(url.get("stage"));
  const sort = APPLICANT_SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "newest";
  const resetKey = [url.get("q"), url.get("stage"), url.get("at"), url.get("vacancy"), url.get("client"), url.get("recruiter"), sort].join("|");
  const batch = useBatch(resetKey);
  const query: ApplicantsQuery = {
    search: url.get("q"),
    tab: resolved.tab,
    stage: url.get("at") || resolved.stage,
    vacancyId: url.get("vacancy"),
    clientId: url.get("client"),
    recruiterId: url.get("recruiter"),
    sort,
    page: 1,
    pageSize: batch.limit,
  };

  const live = useApplicantsList(query);
  // Keep showing the previous results while a new filter loads (no skeleton flash).
  const [shown, setShown] = useState<ApplicantsPage | null>(null);
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
    url.set({ q: undefined, stage: undefined, at: undefined, vacancy: undefined, client: undefined, recruiter: undefined });
  };

  const clearFilters = () => url.set({ stage: undefined, at: undefined, vacancy: undefined, client: undefined, recruiter: undefined });
  const filterDefs: FilterDef[] = [
    { key: "vacancy", control: "select", label: "Vacancy", value: query.vacancyId || ANY, onChange: (v) => setFilter("vacancy", v), options: withAny("All vacancies", (page?.facets.vacancies ?? []).map((o) => ({ value: o.id, label: o.name }))) },
    { key: "client", control: "select", label: "Client", value: query.clientId || ANY, onChange: (v) => setFilter("client", v), options: withAny("All clients", (page?.facets.clients ?? []).map((o) => ({ value: o.id, label: o.name }))) },
    { key: "recruiter", control: "select", label: "Recruiter", value: query.recruiterId || ANY, onChange: (v) => setFilter("recruiter", v), options: withAny("All recruiters", [...(page?.facets.recruiters ?? []).map((o) => ({ value: o.id, label: o.name })), { value: "none", label: "Unassigned" }]) },
  ];
  const stageDef: FilterDef = { key: "stage", label: "Stage", value: query.tab, onChange: (v) => url.set({ stage: v === "all" ? undefined : v }), options: STAGE_TABS.map((t) => ({ value: t.key, label: `${t.label}${page ? ` ${page.tabCounts[t.key]}` : ""}` })), control: "chips" };
  const sortDef: FilterDef = { key: "sort", label: "Sort", value: sort, onChange: (v) => url.set({ sort: v === "newest" ? undefined : v }), options: APPLICANT_SORTS, control: "select" };
  const appliedChips: ActiveChip[] = [
    ...(query.tab !== "all" ? [{ key: "__tab", label: "Stage", text: STAGE_TABS.find((t) => t.key === query.tab)?.label ?? query.tab, onRemove: () => url.set({ stage: undefined }) }] : []),
    ...activeFilterChips(filterDefs),
  ];
  const filtersActive = !!(query.search || query.stage || query.vacancyId || query.clientId || query.recruiterId);
  const anyNarrowing = filtersActive || query.tab !== "all";

  if (live.status === "error" || live.status === "restricted") {
    return (
      <>
        <PageHeading title="Applicants" />
        <ErrorPanel title={live.status === "restricted" ? "Applicants are not available for this account" : "We could not load the applicants"} retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Applicants" label="Loading applicants" />;

  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Applicants" />
        <div className={EMPTY_CARD}>
          <EmptyState icon={Users} title="No applicants yet" description="Applications appear here as soon as people apply for a published vacancy." />
        </div>
      </>
    );
  }

  const refreshing = live.status === "loading";

  async function moveToPool(r: ApplicantRow) {
    await confirmAction({
      tone: "neutral",
      title: `Move ${r.name} to the Talent Pool?`,
      description: "They stay on record and can be matched to future roles. Their application and history are kept.",
      points: [`Source vacancy: ${r.vacancy}`, "The move is written to their activity history."],
      confirmLabel: "Move to Talent Pool",
      onConfirm: async () => {
        await performApplicantAction(r.id, { action: "talent-pool" });
        live.retry();
      },
    });
  }
  const menuFor = (r: ApplicantRow) => (
    <RowMenu
      label={`Actions for ${r.name}`}
      items={[{ label: "View applicant", href: applicantHref(r.id) }, ...(r.inTalentPool ? [] : [{ label: "Move to Talent Pool", onSelect: () => void moveToPool(r) }])]}
    />
  );

  return (
    <div>
      <PageHeading title="Applicants" />

      <section aria-label="Applicants" data-search-scope className="ap-card min-w-0 rounded-[20px] p-4.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none">
      {/* Phones: toolbar frame, then the list in its own frame (no big card around both). */}
      <div className="contents max-[767px]:mb-4 max-[767px]:block">
      <SearchBar
        search={{ value: searchText, onChange: onSearch, label: "Search applicants", placeholder: "Search name or role" }}
        settleKey={appliedChips.map((c) => c.text).join("|")}
        filterSlot={
        <FiltersButton active={appliedChips.length} resultCount={page.total} onClear={clearFilters}>
          {({ sheet }) => (
            <>
              <FilterSection title="Stage">
                <FilterField f={stageDef} sheet={sheet} />
              </FilterSection>
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
      <PhoneScopeSlot />
      {/* Desktop and tablet: ONE pill row, All first, the count inside each pill. Phones keep their own tab row (hidden here). */}
      {deskScope ?? (
        <DeskPills
          label="Applicants by stage"
          pills={STAGE_TABS.map((t) => ({ key: t.key, label: t.label, count: page.tabCounts[t.key], active: query.tab === t.key, onClick: () => url.set({ stage: t.key === "all" ? undefined : t.key }) }))}
        />
      )}
      <ActiveChips chips={appliedChips} onClearAll={clearFilters} className="mb-6 max-[767px]:mb-0" />
      </div>
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          anyNarrowing ? (
            <NoResults
              noun="applicants"
              filters={filterDefs}
              search={query.search}
              onClearSearch={() => {
                setSearchText("");
                url.set({ q: undefined });
              }}
              tab={query.tab !== "all" ? { label: "Stage", text: STAGE_TABS.find((t) => t.key === query.tab)?.label ?? query.tab, onRemove: () => url.set({ stage: undefined }) } : null}
              onClear={clearAll}
            />
          ) : (
            <div className="py-6">
              <EmptyState icon={Users} title="No applicants in this view" description="There are no applicants to show yet." />
            </div>
          )
        ) : (
          <>
            <ApplicantTable rows={page.rows} menuFor={menuFor} />
            <ApplicantCards rows={page.rows} menuFor={menuFor} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filtersActive ? clearAll : null} />
      </section>
    </div>
  );
}

/* ---------- table (wide containers) ---------- */

const COLS = "grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_40px]";

function ApplicantTable({ rows, menuFor }: { rows: ApplicantRow[]; menuFor: (r: ApplicantRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Applicants" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[820px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 rounded-t-xl border-b border-(--ap-line-2) bg-(--ap-surface) px-4 py-3 ${TH}`}>
        <span role="columnheader">Applicant</span>
        <span role="columnheader">Role</span>
        <span role="columnheader">Stage</span>
        <span role="columnheader">Next action</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-14 px-4 py-2.5 first:border-t-0`}>
          <div role="cell" className="flex min-w-0 items-center gap-3">
            <InitialsAvatar name={r.name} size={36} />
            <div className="min-w-0 leading-tight">
              <Link href={applicantHref(r.id)} className="block text-[15px] font-bold [overflow-wrap:anywhere] text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
              <span className="mt-0.5 block text-[13px] text-(--ap-muted)">Applied {formatDateTime(r.appliedAt)}</span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <b className="block text-[14px] [overflow-wrap:anywhere]">{r.vacancy}</b>
            <span className="mt-0.5 block text-[13px] leading-snug [overflow-wrap:anywhere] text-(--ap-muted)">
              {r.client}, {r.outlet}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <StageMark row={r} />
          </div>
          <div role="cell" className="min-w-0">
            <NextState row={r} />
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function NextState({ row: r }: { row: ApplicantRow }) {
  return (
    <div className="min-w-0 leading-tight" title={`Documents ${r.documentsPercent}% · Profile ${r.profilePercent}%`}>
      {r.nextAction ? (
        <span className="flex min-w-0 items-center gap-2 text-[13px]">
          {r.needsAttention ? <span aria-label="Needs attention" className="ap-dot-attn" /> : null}
          <span className="[overflow-wrap:anywhere] text-(--ap-ink-2)">{r.nextAction}</span>
        </span>
      ) : (
        <span className="block text-[13px] text-(--ap-muted)">Nothing waiting</span>
      )}
      {/* The old table's progress hint, kept: one thin bar for the profile and documents completed so far. */}
      <span className="mt-1.5 flex items-center gap-2 text-[12px] text-(--ap-muted)">
        <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
          <span className="block h-full rounded-full bg-(--ap-violet)" style={{ width: `${Math.max(0, Math.min(100, Math.round((r.documentsPercent + r.profilePercent) / 2)))}%` }} />
        </span>
        <span className="tabular-nums">Docs {r.documentsPercent}% · Profile {r.profilePercent}%</span>
      </span>
    </div>
  );
}

/* ---------- stacked cards (phones, narrow containers) ---------- */

function ApplicantCards({ rows, menuFor }: { rows: ApplicantRow[]; menuFor: (r: ApplicantRow) => React.ReactNode }) {
  // Phone rule: two lines. Name + stage, then the role and the one thing that needs doing.
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[820px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <InitialsAvatar name={r.name} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-2">
                <Link href={applicantHref(r.id)} className="min-w-0 truncate text-[15px] font-bold text-(--ap-ink)">
                  {r.name}
                </Link>
                {r.needsAttention ? <span aria-label="Needs attention" className="size-2 shrink-0 rounded-full bg-(--ap-rose)" /> : null}
              </div>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${r.vacancy} · ${r.client}, ${r.outlet}`}>
                {r.vacancy} · {r.nextAction ?? `Applied ${formatDateTime(r.appliedAt)}`}
              </span>
            </div>
            <span className="shrink-0"><StageMark row={r} /></span>
            <span className="max-[767px]:hidden">{menuFor(r)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
