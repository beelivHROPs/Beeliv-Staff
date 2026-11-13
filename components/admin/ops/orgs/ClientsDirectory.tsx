"use client";

/**
 * Operations "Clients & Outlets": every client at a glance (outlets, deployed
 * staff, assigned HR with the red "No HR assigned" flag, open vacancies,
 * requests waiting). Search plus ONE Filters button (HR officer, status). The
 * whole row opens the client; the dots menu offers Assign / Reassign HR (the
 * existing sheet). Desktop: one clean table. Phone: one container of 56px rows
 * (avatar, name, one muted line), the dots menu as a bottom sheet.
 * States: loading, no clients, nothing matches, error, restricted.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ANY, BODY_ROW, HEAD_ROW, ListToolbar, TH } from "@/components/admin/listKit";
import { Banner, GROUP, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { AssignSheet, type AssignDone } from "@/components/admin/ops/assign/AssignSheet";
import { HrAvatar, NoHrChip } from "@/components/admin/ops/assign/parts";
import { OpsOnly } from "@/components/admin/ops/parts";
import { AddClientButton } from "@/components/admin/org-records/OrgActions";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight, Search, X } from "@/components/applicant/icons";
import { Store } from "@/components/client/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsClients } from "@/lib/admin/ops/opsclients-hooks";
import type { ClientStatusKey, OpsClientRow, OpsClientsPage, OpsClientsQuery } from "@/lib/admin/ops/opsclients-types";
import { plural } from "@/lib/client/format";
import { opsClientHref } from "./parts";

const STATUS_OPTIONS: { value: ClientStatusKey; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "invited", label: "Invited" },
  { value: "inactive", label: "Inactive" },
];
const isStatus = (v: string): v is ClientStatusKey => STATUS_OPTIONS.some((o) => o.value === v);
const COLS = "grid-cols-[minmax(0,1.5fr)_64px_64px_minmax(0,1.3fr)_92px_84px_40px_20px]";

export function ClientsDirectory() {
  return (
    <OpsOnly what="Clients & Outlets" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const url = useUrlParams();
  const rawStatus = url.get("status");
  const query: OpsClientsQuery = { search: url.get("q"), hrId: url.get("hr"), status: isStatus(rawStatus) ? rawStatus : "" };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const live = useOpsClients(query);
  const [last, setLast] = useState<OpsClientsPage | null>(null);
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
  const setParam = (key: "hr" | "status") => (v: string) => {
    setLimit(SHOW_MORE_STEP);
    url.set({ [key]: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    setLimit(SHOW_MORE_STEP);
    url.set({ q: undefined, hr: undefined, status: undefined });
  };
  const narrowed = !!(query.search || query.hrId || query.status);
  const heading = <PageHeading title="Clients & Outlets" right={<AddClientButton hrefFor={opsClientHref} />} />;

  if (live.status === "error")
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load clients" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {heading}
        <Restricted what="Clients & Outlets" />
      </>
    );
  if (!page) return <Skeleton />;
  if (page.workspaceEmpty)
    return (
      <>
        {heading}
        <div className={`${GROUP} p-6 min-[768px]:p-8`}>
          <EmptyState icon={Store} title="No clients yet" description="When HR invites a client, it appears here." />
        </div>
      </>
    );

  const shown = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  const hrOptions = [{ value: ANY, label: "Any" }, { value: "none", label: "No HR assigned" }, ...page.facets.hr.map((h) => ({ value: h.id, label: h.name }))];

  return (
    <div>
      {heading}
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done}
        </Banner>
      ) : null}
      <ListToolbar
        tabsLabel="Clients"
        search={{ value: searchText, onChange: onSearch, label: "Search clients", placeholder: "Search client or HR officer" }}
        groups={[
          { key: "hr", title: "HR officer", filters: [{ key: "hr", label: "HR officer", value: query.hrId || ANY, onChange: setParam("hr"), options: hrOptions }] },
          { key: "status", title: "Status", filters: [{ key: "status", label: "Status", value: query.status || ANY, onChange: setParam("status"), options: [{ value: ANY, label: "Any" }, ...STATUS_OPTIONS] }] },
        ]}
        sort={null}
        resultCount={page.total}
        onClearFilters={() => url.set({ hr: undefined, status: undefined })}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className={`${GROUP} py-6`}>
            <EmptyState
              icon={Search}
              title="No clients match"
              description="Check the spelling, or clear a filter."
              action={
                <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                  <X className="size-4" aria-hidden="true" /> Clear search and filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            <Table rows={shown} onAssign={setAssignFor} />
            <PhoneList rows={shown} onAssign={setAssignFor} />
          </>
        )}
      </div>
      <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed ? clearAll : null} />

      {assignFor ? (
        <AssignSheet
          clientId={assignFor}
          onClose={() => setAssignFor(null)}
          onDone={(r: AssignDone) => {
            setAssignFor(null);
            const hr = r.detail.hr?.name ?? "";
            setDone(r.reassigned ? `Saved. ${r.detail.name} moved from ${r.previousHr} to ${hr}.` : `Saved. ${hr} now looks after ${r.detail.name}.`);
          }}
        />
      ) : null}
    </div>
  );
}

function menuItems(r: OpsClientRow, onAssign: (id: string) => void) {
  return [{ label: "Open client", href: opsClientHref(r.id) }, { label: r.hr ? "Reassign HR" : "Assign HR", onSelect: () => onAssign(r.id) }];
}

function Table({ rows, onAssign }: { rows: OpsClientRow[]; onAssign: (id: string) => void }) {
  return (
    <div role="table" aria-label="Clients" className="hidden @min-[700px]:block">
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Client</span>
        <span role="columnheader" className={`${TH} text-right`}>Outlets</span>
        <span role="columnheader" className={`${TH} text-right`}>Staff</span>
        <span role="columnheader" className={TH}>HR officer</span>
        <span role="columnheader" className={`${TH} text-right`}>Vacancies</span>
        <span role="columnheader" className={`${TH} text-right`}>Requests</span>
        <span role="columnheader" className="sr-only">Actions</span>
        <span role="columnheader" className="sr-only">Open</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
          <div role="cell" className="min-w-0">
            <Link href={opsClientHref(r.id)} className="block text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
              {r.name}
            </Link>
            <span className="mt-0.5 block text-[12.5px] text-(--ap-muted)">{r.statusLabel}</span>
          </div>
          <span role="cell" className="text-right text-[14px] text-(--ap-ink-2) tabular-nums">{r.outletsCount}</span>
          <span role="cell" className="text-right text-[14px] text-(--ap-ink-2) tabular-nums">{r.deployedStaff}</span>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            {r.hr ? (
              <>
                <HrAvatar hr={r.hr} size={32} />
                <span className="min-w-0 text-[14px] text-(--ap-ink)">{r.hr.name}</span>
              </>
            ) : (
              <NoHrChip />
            )}
          </div>
          <span role="cell" className="text-right text-[14px] text-(--ap-ink-2) tabular-nums">{r.openVacancies}</span>
          <span role="cell" className={`text-right text-[14px] tabular-nums ${r.requestsWaiting > 0 ? "font-semibold text-(--ap-ink)" : "text-(--ap-ink-2)"}`}>{r.requestsWaiting}</span>
          <div role="cell" data-no-row>
            <RowMenu label={`Actions for ${r.name}`} items={menuItems(r, onAssign)} />
          </div>
          <div role="cell" aria-hidden="true">
            <ChevronRight className="size-4 text-(--ap-faint)" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Phone: one container, avatar rows, one muted line, the dots menu as a bottom sheet. */
function PhoneList({ rows, onAssign }: { rows: OpsClientRow[]; onAssign: (id: string) => void }) {
  return (
    <ul className={`${GROUP} m-0 list-none p-0 @min-[700px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={`ad-clickrow flex min-h-14 items-center gap-3 pr-1 pl-3.5 ${ROW_LINE}`}>
          <HrAvatar hr={r.hr} size={40} />
          <div className="min-w-0 flex-1 py-2">
            <Link href={opsClientHref(r.id)} className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">
              {r.name}
            </Link>
            {r.hr ? (
              <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">
                {r.hr.name} · {plural(r.deployedStaff, "staff", "staff")}
                {r.requestsWaiting > 0 ? ` · ${r.requestsWaiting} waiting` : ""}
              </span>
            ) : (
              <span className="mt-0.5 block text-[13px] leading-snug font-semibold text-(--ap-rose)">No HR assigned</span>
            )}
          </div>
          <div data-no-row>
            <RowMenu label={`Actions for ${r.name}`} items={menuItems(r, onAssign)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-[14px]";
  return (
    <div role="status" aria-busy="true" aria-label="Loading clients">
      <PageHeading title="Clients & Outlets" />
      <div className={`${sk} mb-3 h-11`} />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${sk} h-16`} />
        ))}
      </div>
    </div>
  );
}
