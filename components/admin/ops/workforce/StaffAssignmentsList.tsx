"use client";

/**
 * Operations "Staff Assignments": every staff member with where they work now
 * (client, outlet, role). The "Unassigned" chip comes first. One main button,
 * "Reassign" (side sheet, bottom sheet on phones). Whole row opens the person;
 * the dots menu offers Open and Reassign. Earlier placements are kept as history
 * (count on the row, list on the person's page). Desktop: one clean table.
 * Phone: one container of 56px rows. States: loading, no staff, nothing
 * matches, nothing unassigned, error, restricted. Success only after the
 * adapter confirms.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ANY, BODY_ROW, HEAD_ROW, ListToolbar, TH } from "@/components/admin/listKit";
import { Banner, GROUP, MAIN_BTN, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { opsStaffHref, StaffStateChip } from "@/components/admin/ops/orgs/parts";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight, Plus, Search, Users, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsStaff } from "@/lib/admin/ops/staffassign-hooks";
import type { OpsStaffPage, OpsStaffQuery, OpsStaffRow, StaffShow } from "@/lib/admin/ops/staffassign-types";
import { plural } from "@/lib/client/format";
import { AddStaffButton } from "@/components/admin/org-records/OrgActions";
import { ReassignSheet, type ReassignDone } from "./ReassignSheet";
import { UnassignedChip } from "./parts";

const COLS = "grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_84px_40px_20px]";
type SheetState = { staffId?: string } | null;

export function StaffAssignmentsList() {
  return (
    <OpsOnly what="Staff Assignments" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const url = useUrlParams();
  const query: OpsStaffQuery = { search: url.get("q"), show: url.get("show") === "unassigned" ? "unassigned" : "all", clientId: url.get("client") };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [done, setDone] = useState<string | null>(null);

  const live = useOpsStaff(query);
  const [last, setLast] = useState<OpsStaffPage | null>(null);
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
  const setClient = (v: string) => {
    setLimit(SHOW_MORE_STEP);
    url.set({ client: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    setLimit(SHOW_MORE_STEP);
    url.set({ q: undefined, client: undefined, show: undefined });
  };
  const narrowed = !!(query.search || query.clientId);

  const onDone = (r: ReassignDone) => {
    setSheet(null);
    const to = r.detail.current;
    setDone(r.previous ? `Saved. ${r.detail.name} moved from ${r.previous.client} to ${to?.client}, ${to?.outlet}. The earlier placement is in their history.` : `Saved. ${r.detail.name} now works at ${to?.client}, ${to?.outlet}.`);
  };

  const main = (
    <button type="button" onClick={() => setSheet({})} className={MAIN_BTN}>
      <Plus className="size-4" aria-hidden="true" /> Reassign
    </button>
  );
  const heading = <PageHeading title="Staff Assignments" right={<span className="flex flex-wrap items-center gap-2.5"><AddStaffButton />{page && !page.workspaceEmpty ? main : null}</span>} />;

  if (live.status === "error")
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load staff assignments" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {heading}
        <Restricted what="Staff Assignments" />
      </>
    );
  if (!page) return <Skeleton />;
  if (page.workspaceEmpty)
    return (
      <>
        {heading}
        <div className={`${GROUP} p-6 min-[768px]:p-8`}>
          <EmptyState icon={Users} title="No staff yet" description="When HR approves an applicant as staff, they appear here, ready to be placed with a client." />
        </div>
      </>
    );

  const shown = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  const choose = (id: string) => setSheet({ staffId: id });

  return (
    <div>
      {heading}
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done}
        </Banner>
      ) : null}
      <ListToolbar
        tabsLabel="Show staff"
        tabs={[
          { key: "unassigned" as StaffShow, label: "Unassigned", count: page.counts.unassigned },
          { key: "all" as StaffShow, label: "All", count: page.counts.all },
        ]}
        tab={query.show}
        onTab={(k: StaffShow) => {
          setLimit(SHOW_MORE_STEP);
          url.set({ show: k === "all" ? undefined : k });
        }}
        search={{ value: searchText, onChange: onSearch, label: "Search staff", placeholder: "Search name, client, outlet or role" }}
        groups={[{ key: "client", title: "Client", filters: [{ key: "client", label: "Client", value: query.clientId || ANY, onChange: setClient, options: [{ value: ANY, label: "Any" }, ...page.facets.clients.map((c) => ({ value: c.id, label: c.name }))] }] }]}
        sort={null}
        resultCount={page.total}
        onClearFilters={() => url.set({ client: undefined })}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className={`${GROUP} py-6`}>
            {query.show === "unassigned" && !narrowed ? (
              <EmptyState icon={Users} title="Everyone has a placement" description="Nobody is waiting for a client." />
            ) : (
              <EmptyState
                icon={Search}
                title="No staff match"
                description="Check the spelling, or clear a filter."
                action={
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                }
              />
            )}
          </div>
        ) : (
          <>
            <Table rows={shown} onReassign={choose} />
            <PhoneList rows={shown} onReassign={choose} />
          </>
        )}
      </div>
      <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed || query.show === "unassigned" ? clearAll : null} />

      {sheet ? <ReassignSheet staffId={sheet.staffId} choices={sheet.staffId ? undefined : page.choices} onClose={() => setSheet(null)} onDone={onDone} /> : null}
    </div>
  );
}

const menuItems = (r: OpsStaffRow, onReassign: (id: string) => void) => [
  { label: "Open staff page", href: opsStaffHref(r.id) },
  { label: r.current ? "Reassign" : "Assign to a client", onSelect: () => onReassign(r.id) },
];

function Table({ rows, onReassign }: { rows: OpsStaffRow[]; onReassign: (id: string) => void }) {
  return (
    <div role="table" aria-label="Staff and where they work" className="hidden @min-[760px]:block">
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Staff</span>
        <span role="columnheader" className={TH}>Client</span>
        <span role="columnheader" className={TH}>Outlet</span>
        <span role="columnheader" className={TH}>Role</span>
        <span role="columnheader" className={`${TH} text-right`}>History</span>
        <span role="columnheader" className="sr-only">Actions</span>
        <span role="columnheader" className="sr-only">Open</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <AdminAvatar name={r.name} size={36} />
            <div className="min-w-0">
              <Link href={opsStaffHref(r.id)} className="block text-[15px] leading-tight font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
              {r.status !== "active" ? (
                <span className="mt-0.5 block">
                  <StaffStateChip status={r.status} />
                </span>
              ) : null}
            </div>
          </div>
          {r.current ? (
            <>
              <span role="cell" className="min-w-0 text-[14px] text-(--ap-ink)">{r.current.client}</span>
              <span role="cell" className="min-w-0 text-[14px] text-(--ap-ink-2)">{r.current.outlet}</span>
              <span role="cell" className="min-w-0 text-[14px] text-(--ap-ink-2)">{r.current.role}</span>
            </>
          ) : (
            <div role="cell" className="col-span-3 flex items-center gap-3">
              <UnassignedChip />
              <span className="text-[13px] text-(--ap-muted)">Approved, waiting for a client</span>
            </div>
          )}
          <span role="cell" className="text-right text-[13px] text-(--ap-muted)">{r.previousCount > 0 ? `${r.previousCount} earlier` : "None"}</span>
          <div role="cell" data-no-row>
            <RowMenu label={`Actions for ${r.name}`} items={menuItems(r, onReassign)} />
          </div>
          <div role="cell" aria-hidden="true">
            <ChevronRight className="size-4 text-(--ap-faint)" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PhoneList({ rows, onReassign }: { rows: OpsStaffRow[]; onReassign: (id: string) => void }) {
  return (
    <ul className={`${GROUP} m-0 list-none p-0 @min-[760px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={`ad-clickrow flex min-h-14 items-center gap-3 pr-1 pl-3.5 ${ROW_LINE}`}>
          <AdminAvatar name={r.name} size={40} />
          <div className="min-w-0 flex-1 py-2">
            <Link href={opsStaffHref(r.id)} className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">
              {r.name}
            </Link>
            {r.current ? (
              <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">
                {r.current.role} · {r.current.client}
                {r.previousCount > 0 ? ` · ${plural(r.previousCount, "earlier placement")}` : ""}
              </span>
            ) : (
              <span className="mt-0.5 block text-[13px] leading-snug font-semibold text-(--ap-warn)">Unassigned</span>
            )}
          </div>
          <div data-no-row>
            <RowMenu label={`Actions for ${r.name}`} items={menuItems(r, onReassign)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-[14px]";
  return (
    <div role="status" aria-busy="true" aria-label="Loading staff assignments">
      <PageHeading title="Staff Assignments" />
      <div className={`${sk} mb-3 h-9 w-56`} />
      <div className={`${sk} mb-3 h-11`} />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${sk} h-16`} />
        ))}
      </div>
    </div>
  );
}
