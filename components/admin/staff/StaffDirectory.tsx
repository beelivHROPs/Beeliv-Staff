"use client";

/**
 * Staff Directory (HR, spec 28.1 / 9.1). Scope = assigned clients / outlets only
 * (the adapter enforces it). Lists NEVER carry NIN, bank, next of kin, home
 * address or medical data (spec 29.4); those exist only as masked placeholders
 * on Staff 360. Layout reflows by the CONTAINER width: table when wide, cards
 * when narrow, so nothing clips or scrolls sideways from 360px to 2560px.
 * Reuses: ClientAvatar, StatusChip (via StaffStatusChip), SearchField,
 * FilterSelect + FILTER_ROW (Client records-filters), FilterTabs, EmptyState,
 * PageHeading, ClientPageSkeleton / ClientPageError.
 */
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { PhoneHero } from "@/components/admin/PhoneHero";
import { ChevronRight, IdCard, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ActiveChips, BODY_ROW, CARD_ITEM, CARD_LIST, PhoneScopeSlot, TABLE_CARD, TH, useDeskScope, activeFilterChips, useBatch, type ActiveChip, type FilterDef } from "@/components/admin/listKit";
import { DeskPills, FilterField, FilterSection, FiltersButton, StatusMark } from "@/components/admin/standard";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { ShowMore } from "@/components/admin/ShowMore";
import { InviteButton } from "@/components/admin/team-access/InviteButton";
import { AddStaffButton } from "@/components/admin/org-records/OrgActions";
import { formatDateTime } from "@/lib/admin/sort";
import { useStaffList } from "@/lib/admin/staff/hooks";
import { STAFF_SORTS, type StaffPage, type StaffQuery, type StaffRow, type StaffStatus } from "@/lib/admin/staff/types";
import { ANY, AdminState, STAFF_STATUS_OPTIONS, staffHref, useUrlParams, withAny } from "./parts";

export function StaffDirectory() {
  const url = useUrlParams();
  const deskScope = useDeskScope();
  const status = url.get("status") as "" | StaffStatus;
  const sort = STAFF_SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "name";
  const batch = useBatch([url.get("q"), url.get("client"), url.get("outlet"), url.get("dept"), url.get("role"), url.get("status"), sort].join("|"));
  const query: StaffQuery = {
    search: url.get("q"),
    clientId: url.get("client"),
    outletId: url.get("outlet"),
    department: url.get("dept"),
    role: url.get("role"),
    status: STAFF_STATUS_OPTIONS.some((o) => o.key === status) ? status : "",
    sort,
    page: 1,
    pageSize: batch.limit,
  };

  const live = useStaffList(query);
  // Keep the previous results on screen while a new filter loads (no skeleton flash).
  const [shown, setShown] = useState<StaffPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };
  const setFilter = (key: string, v: string) => url.set({ [key]: v === ANY || v === "" ? undefined : v });
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined, client: undefined, outlet: undefined, dept: undefined, role: undefined, status: undefined });
  };
  const filterDefs: FilterDef[] = page
    ? [
        { key: "client", control: "select", label: "Client", value: query.clientId || ANY, onChange: (v) => url.set({ client: v === ANY ? undefined : v, outlet: undefined }), options: withAny("All clients", page.facets.clients.map((c) => ({ value: c.id, label: c.name }))) },
        { key: "outlet", control: "select", label: "Outlet", value: query.outletId || ANY, onChange: (v) => setFilter("outlet", v), options: withAny("All outlets", page.facets.outlets.filter((o) => !query.clientId || o.clientId === query.clientId).map((o) => ({ value: o.id, label: o.name }))) },
        { key: "dept", control: "select", label: "Department", value: query.department || ANY, onChange: (v) => setFilter("dept", v), options: withAny("All departments", page.facets.departments.map((d) => ({ value: d, label: d }))) },
        { key: "role", control: "select", label: "Role", value: query.role || ANY, onChange: (v) => setFilter("role", v), options: withAny("All roles", page.facets.roles.map((d) => ({ value: d, label: d }))) },
      ]
    : [];
  const statusDef: FilterDef | null = page ? { key: "status", label: "Status", control: "chips", value: query.status || "all", onChange: (v) => url.set({ status: v === "all" ? undefined : v }), options: STAFF_STATUS_OPTIONS.map((o) => ({ value: o.key || "all", label: `${o.label} ${page.statusCounts[o.key || "all"]}` })) } : null;
  const sortDef: FilterDef = { key: "sort", label: "Sort", value: sort, onChange: (v) => url.set({ sort: v === "name" ? undefined : v }), options: STAFF_SORTS, control: "select" };
  const clearFilters = () => url.set({ client: undefined, outlet: undefined, dept: undefined, role: undefined, status: undefined });
  const appliedChips: ActiveChip[] = [...(query.status && page ? [{ key: "__status", label: "Status", text: STAFF_STATUS_OPTIONS.find((o) => o.key === query.status)?.label ?? query.status, onRemove: () => url.set({ status: undefined }) }] : []), ...activeFilterChips(filterDefs)];
  const narrowing = !!(query.search || query.clientId || query.outletId || query.department || query.role || query.status);

  return (
    <AdminState status={page ? "ready" : live.status} title="Staff Directory" what="the staff directory" retry={live.retry}>
      {!page ? null : page.workspaceEmpty ? (
        <>
          <PageHeading title="Staff Directory" right={<span className="flex flex-wrap items-center gap-2.5"><AddStaffButton /><InviteButton kind="staff" autoOpen={false} /></span>} />
          <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
            <EmptyState icon={IdCard} title="No staff in your clients yet" description="People appear here once they are assigned to one of your clients or outlets." />
          </div>
        </>
      ) : (
        <div>
          <PageHeading title="Staff Directory" right={<span className="flex flex-wrap items-center gap-2.5"><AddStaffButton /><InviteButton kind="staff" autoOpen={false} /></span>} />
          <section aria-label="Staff" data-search-scope className="ap-card min-w-0 rounded-[20px] p-4.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none">
            <div className="contents max-[767px]:mb-4 max-[767px]:block">
            <SearchBar
              className="mb-3 max-[767px]:mb-0"
              search={{ value: searchText, onChange: onSearch, label: "Search staff", placeholder: "Search name, role or department" }}
              settleKey={appliedChips.map((c) => c.text).join("|")}
              filterSlot={
              <FiltersButton active={appliedChips.length} resultCount={page.total} onClear={clearFilters}>
                {({ sheet }) => (
                  <>
                    {statusDef ? (
                      <FilterSection title="Status">
                        <FilterField f={statusDef} sheet={sheet} />
                      </FilterSection>
                    ) : null}
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
            <div className="mt-3.5 min-[768px]:hidden">
              <PhoneHero hero="Your workforce" figure={page.statusCounts.all} unit="team members" side={{ value: page.statusCounts.active ?? 0, label: "active" }} />
            </div>
            {deskScope ?? (
              <DeskPills
                label="Staff by status"
                pills={STAFF_STATUS_OPTIONS.map((o) => ({ key: o.key || "all", label: o.label, count: page.statusCounts[o.key || "all"], active: (query.status || "") === o.key, onClick: () => url.set({ status: o.key || undefined }) }))}
              />
            )}
            <ActiveChips chips={appliedChips} onClearAll={clearFilters} className="mb-6 max-[767px]:mb-0" />
            </div>
          <div className={`@container transition-opacity ${live.status === "loading" ? "opacity-60" : ""}`} aria-busy={live.status === "loading"}>
            {page.total === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={query.search ? Search : IdCard}
                  title={query.search ? "No staff match your search" : "No staff in this view"}
                  description={query.search ? "Check the spelling, or try a name, role or reference." : "No staff match the current filters."}
                  action={
                    narrowing ? (
                      <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                        <X className="size-4" aria-hidden="true" /> Clear search and filters
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                <StaffTable rows={page.rows} />
                <StaffCards rows={page.rows} lettered={sort === "name"} />
              </>
            )}
          </div>
          <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={narrowing ? clearAll : null} />
          </section>
        </div>
      )}
    </AdminState>
  );
}

const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_24px]";

function HrCell({ row }: { row: StaffRow }) {
  const h = row.assignedHr;
  return (
    <span className="min-w-0 truncate">
      {h.primary?.name ?? "Unassigned"}
      {h.additional > 0 ? ` +${h.additional}` : null}
    </span>
  );
}

function StaffTable({ rows }: { rows: StaffRow[] }) {
  return (
    <div role="table" aria-label="Staff" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[860px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 rounded-t-xl border-b border-(--ap-line-2) bg-(--ap-surface) px-4 py-3 ${TH}`}>
        <span role="columnheader">Staff</span>
        <span role="columnheader">Client / outlet</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Open
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-14 px-4 py-2.5 first:border-t-0`}>
          <div role="cell" className="flex min-w-0 items-center gap-3">
            <AdminAvatar name={r.name} size={36} viewable />
            <div className="min-w-0 leading-tight">
              <Link href={staffHref(r.id)} className="block text-[15px] font-bold [overflow-wrap:anywhere] text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
              <span className="mt-0.5 block text-[13px] [overflow-wrap:anywhere] text-(--ap-muted)">
                {r.role} · {r.department}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <b className="block text-[14px] [overflow-wrap:anywhere]">{r.client}</b>
            <span className="mt-0.5 block text-[13px] [overflow-wrap:anywhere] text-(--ap-muted)">
              {r.outlet} · Started {formatDateTime(r.assignmentStart)}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <StaffStatusMark status={r.status} />
            <span className="mt-1 flex min-w-0 text-[12px] text-(--ap-muted)">
              <span className="shrink-0">HR:&nbsp;</span>
              <HrCell row={r} />
            </span>
          </div>
          <span role="cell" className="text-(--ap-faint)">
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      ))}
    </div>
  );
}

function StaffCards({ rows, lettered }: { rows: StaffRow[]; lettered: boolean }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[860px]:hidden`}>
      {rows.map((r, i) => (
        <Fragment key={r.id}>
          {lettered && (i === 0 || r.name.charAt(0).toUpperCase() !== rows[i - 1].name.charAt(0).toUpperCase()) ? (
            <li aria-hidden="true" className="mt-1 flex items-center gap-3 px-1 text-[13px] font-bold text-(--ap-violet) first:mt-0 max-[767px]:hidden">
              {r.name.charAt(0).toUpperCase()}
              <span className="h-px flex-1 bg-(--ap-line)" />
            </li>
          ) : null}
        <li className={`${CARD_ITEM} relative`}>
          <div className="flex items-center gap-2.5">
            <AdminAvatar name={r.name} size={40} viewable />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={staffHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) after:absolute after:inset-0 after:content-['']">
                {r.name}
              </Link>
              <span className="block truncate text-[13px] text-(--ap-muted)" title={`${r.role} · ${r.department}`}>
                {r.role} · {r.department}
              </span>
            </div>
            <span className="shrink-0 min-[768px]:hidden"><StaffStatusMark status={r.status} /></span>
            <ChevronRight className="size-4 shrink-0 text-(--ap-faint) max-[767px]:hidden" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 max-[767px]:hidden">
            <StaffStatusMark status={r.status} />
            <span className="min-w-0 truncate text-[12px] text-(--ap-muted)" title={`${r.client}, ${r.outlet}`}>
              {r.client}, {r.outlet} · Started {formatDateTime(r.assignmentStart)}
            </span>
          </div>
        </li>
        </Fragment>
      ))}
    </ul>
  );
}

/** Status as a quiet dot and word (colour only for suspended). */
function StaffStatusMark({ status }: { status: StaffStatus }) {
  return <StatusMark tone={status === "active" ? "ok" : status === "on-leave" ? "info" : "bad"}>{STAFF_STATUS_OPTIONS.find((o) => o.key === status)?.label ?? status}</StatusMark>;
}
