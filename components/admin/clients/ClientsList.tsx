"use client";

/**
 * Clients & Outlets list (HR sees ASSIGNED clients only; the adapter enforces
 * it). Name, outlets, active staff, open vacancies, assigned HR, status.
 * Reuses: SearchField, FilterTabs, StatusChip, EmptyState, PageHeading, Disc
 * (Overview icon tile), Client icons, ClientPageSkeleton / ClientPageError.
 * Layout reflows by container width: table when wide, cards when narrow.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import { useAdminScope } from "@/lib/admin/scope";
import { Disc } from "@/components/admin/overview/Disc";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListCard, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { AddClientButton } from "@/components/admin/org-records/OrgActions";
import { InviteButton } from "@/components/admin/team-access/InviteButton";
import { Store } from "@/components/client/icons";
import { AdminState, useUrlParams } from "@/components/admin/staff/parts";
import { useClientsList } from "@/lib/admin/clients/hooks";
import { CLIENT_SORTS, type ClientRow, type ClientsPage, type OrgStatus } from "@/lib/admin/clients/types";
import { HrNames, NO_HR_LINE, NoHrChip, ORG_STATUS_OPTIONS, OrgStatusChip, clientHref, clientTabHref } from "./parts";

export function ClientsList() {
  const allClients = useAdminScope().allClients;
  const url = useUrlParams();
  const raw: string = url.get("status");
  const status: "" | OrgStatus = ORG_STATUS_OPTIONS.some((o) => o.key === raw && o.key !== "") ? (raw as OrgStatus) : "";
  const q = url.get("q");
  const sort = CLIENT_SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "name";
  const batch = useBatch([q, status, sort].join("|"));
  const live = useClientsList({ search: q, status, sort, limit: batch.limit });
  const [shown, setShown] = useState<ClientsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [text, setText] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const onSearch = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };

  return (
    <AdminState status={page ? "ready" : live.status} title="Clients & Outlets" what="your clients" retry={live.retry}>
      {!page ? null : (
        <div>
          <PageHeading title="Clients" right={<span className="flex flex-wrap items-center gap-2.5 max-[767px]:gap-1"><Link href="/admin/clients/requests" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold max-[767px]:h-11 max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:px-1 max-[767px]:text-(--ap-violet)! max-[767px]:hover:bg-transparent">Requests</Link><AddClientButton hrefFor={clientHref} /><InviteButton kind="client" /></span>} />
          <ScopeNote />
          {page.workspaceEmpty ? (
            <ScopeGate>
              <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
                <EmptyState icon={Store} title="No clients assigned to you yet" description="Clients appear here once Beeliv Operations assigns you to them." />
              </div>
            </ScopeGate>
          ) : (
            <>
              <ListCard title="Clients" summary={`${page.total} ${page.total === 1 ? "client" : "clients"}${allClients ? "" : " assigned to you"}`}>
              <ListToolbar
                tabsLabel="Filter clients by status"
                tabs={ORG_STATUS_OPTIONS.map((o) => ({ key: o.key || "all", label: o.label, count: page.statusCounts[o.key || "all"] }))}
                tab={(status || "all") as string}
                onTab={(k) => url.set({ status: k === "all" ? undefined : k })}
                search={{ value: text, onChange: onSearch, label: "Search clients", placeholder: "Search client, reference or HR" }}
                sort={{ value: sort, options: CLIENT_SORTS, onChange: (v) => url.set({ sort: v === "name" ? undefined : v }) }}
              />
              <div className={`@container transition-opacity ${live.status === "loading" ? "opacity-60" : ""}`}>
                {page.total === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      icon={Search}
                      title="No clients match"
                      description="Try a different name, or another status."
                      action={
                        <button
                          type="button"
                          className="ap-btn ap-btn-s ap-btn-sm"
                          onClick={() => {
                            setText("");
                            url.set({ q: undefined, status: undefined });
                          }}
                        >
                          <X className="size-4" aria-hidden="true" /> Clear search and filters
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <Table rows={page.rows} />
                    <Cards rows={page.rows} />
                  </>
                )}
              </div>
              <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={q || status ? () => { setText(""); url.set({ q: undefined, status: undefined }); } : null} />
              </ListCard>
            </>
          )}
        </div>
      )}
    </AdminState>
  );
}

const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_24px]";

function Hr({ r }: { r: ClientRow }) {
  return <HrNames names={r.hrNames} primary={r.assignedHr.primary?.name ?? null} />;
}

function HrBlock({ r }: { r: ClientRow }) {
  return r.assignedHr.primary ? (
    <span className="mt-1 flex min-w-0 text-[12px] text-(--ap-muted)">
      <span className="shrink-0">HR:&nbsp;</span>
      <Hr r={r} />
    </span>
  ) : (
    <span className="mt-1 block text-[12px] leading-snug text-(--ap-muted)">
      <NoHrChip />
      <span className="mt-0.5 block">{NO_HR_LINE}</span>
    </span>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Table({ rows }: { rows: ClientRow[] }) {
  return (
    <div role="table" aria-label="Clients" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Client</span>
        <span role="columnheader">Footprint</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Open
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
          <div role="cell" className="flex min-w-0 items-center gap-3">
            <Disc icon={Store} />
            <div className="min-w-0 leading-tight">
              <Link href={clientHref(r.id)} className="block text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)" title={r.name}>
                {r.name}
              </Link>
              <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={r.reference}>
                {r.reference}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <Link href={clientTabHref(r.id, "staff")} className="block truncate text-[14px] font-bold text-(--ap-violet) tabular-nums">
              {plural(r.activeStaff, "active staff member", "active staff")}
            </Link>
            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted) tabular-nums">
              {plural(r.outletsCount, "outlet", "outlets")} · {plural(r.openVacancies, "open vacancy", "open vacancies")}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <OrgStatusChip status={r.status} />
            {r.assignedHr.primary ? (
              <HrBlock r={r} />
            ) : (
              <span className="mt-1 block text-[12px] font-semibold text-(--ap-rose)" title={NO_HR_LINE}>
                No HR assigned
              </span>
            )}
          </div>
          <span role="cell" className="text-(--ap-faint)">
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows }: { rows: ClientRow[] }) {
  // Phone rule: name + status, then one detail line. HR names stay on the client page; only "No HR" is flagged.
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={clientHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.name}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted) tabular-nums">
                {plural(r.outletsCount, "outlet", "outlets")} · {r.activeStaff} staff · {r.openVacancies} open
                {r.assignedHr.primary ? "" : <b className="font-semibold text-(--ap-rose)"> · No HR assigned</b>}
              </span>
              <span className="mt-1 block"><OrgStatusChip status={r.status} /></span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
