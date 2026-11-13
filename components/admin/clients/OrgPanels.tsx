"use client";

/**
 * Panels shared by the Client page and the Outlet page: staff (in page, with
 * search / status / outlet filters, same look as the Staff Directory), vacancies
 * and the activity history. Staff rows open the person's own profile; nothing
 * here sends the user to the Staff Directory list.
 */
import { Can } from "@/components/admin/Can";
import Link from "next/link";
import { useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { DataTable } from "@/components/admin/staff/DataTable";
import { ANY, Card, StaffStatusChip, STAFF_STATUS_OPTIONS, staffHref, withAny } from "@/components/admin/staff/parts";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { Briefcase, ChevronRight, Plus, Search, Users } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { formatDateTime } from "@/lib/admin/sort";
import type { ActivityEntry, ClientStaffRow, HrAssignmentEntry } from "@/lib/admin/clients/types";
import { VacancyStatusChip } from "@/components/admin/vacancies/parts";
import { formatDateShort } from "@/lib/applicant/time";
import { useVacancies } from "@/lib/admin/vacancies/hooks";
import { StatusChip } from "@/components/client/StatusChip";
import { clientVacanciesHref, createVacancyForHref, NO_HR_LINE, NoHrChip, vacancyHref } from "./parts";

const COLS = "grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1fr)_24px]";

export function OrgStaffPanel({ staff, outlets }: { staff: ClientStaffRow[]; outlets?: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [outletId, setOutletId] = useState("");
  const batch = useBatch([q, status, outletId].join("|"));
  const needle = q.trim().toLowerCase();
  const inOutlet = staff.filter((s) => !outletId || s.outletId === outletId);
  const rows = inOutlet.filter((s) => (!status || s.status === status) && (!needle || [s.name, s.role, s.reference, s.outlet].some((x) => x.toLowerCase().includes(needle))));
  const shown = rows.slice(0, batch.limit);
  const narrowing = !!(q || status || outletId);
  const clear = () => {
    setQ("");
    setStatus("");
    setOutletId("");
  };

  return (
    <Card title="Staff" right={<span className="text-[13px] text-(--ap-muted)">{staff.length} {staff.length === 1 ? "person" : "people"}</span>}>
      {staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff assigned yet" description="People appear here once they are assigned." />
      ) : (
        <>
          <ListToolbar
            tabsLabel="Filter staff by outlet"
            tabs={outlets && outlets.length > 1 ? [{ key: "all", label: "All outlets", count: staff.length }, ...outlets.map((o) => ({ key: o.id, label: o.name, count: staff.filter((s) => s.outletId === o.id).length }))] : undefined}
            tab={outletId || "all"}
            onTab={(k) => setOutletId(k === "all" ? "" : k)}
            search={{ value: q, onChange: setQ, label: "Search staff", placeholder: "Search name, role or reference" }}
            sort={null}
            filters={[
              ...(outlets && outlets.length > 1 ? [{ key: "outlet", label: "Outlet", value: outletId || ANY, onChange: (v: string) => setOutletId(v === ANY ? "" : v), options: withAny("All outlets", outlets.map((o) => ({ value: o.id, label: o.name }))) }] : []),
              { key: "status", label: "Status", value: status || ANY, onChange: (v: string) => setStatus(v === ANY ? "" : v), options: withAny("All statuses", STAFF_STATUS_OPTIONS.filter((o) => o.key).map((o) => ({ value: o.key, label: o.label }))) },
            ]}
          />
          <div className="@container">
            {rows.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={Search}
                  title="No staff match"
                  description="Try a different name, outlet or status."
                  action={
                    <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={clear}>
                      Clear search and filters
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                <div role="table" aria-label="Staff" className={`${TABLE_CARD} hidden @min-[760px]:block`}>
                  <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
                    <span role="columnheader">Staff</span>
                    <span role="columnheader">Outlet</span>
                    <span role="columnheader">Status</span>
                    <span role="columnheader" className="sr-only">Open</span>
                  </div>
                  {shown.map((s) => (
                    <div key={s.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[60px]`}>
                      <div role="cell" className="flex min-w-0 items-center gap-2.5">
                        <AdminAvatar name={s.name} size={40} viewable />
                        <div className="min-w-0 leading-tight">
                          <Link href={staffHref(s.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                            {s.name}
                          </Link>
                          <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{s.role}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={s.reference}>
                            {s.reference}
                          </span>
                        </div>
                      </div>
                      <span role="cell" className="min-w-0 truncate text-[14px]" title={s.outlet}>
                        {s.outlet}
                      </span>
                      <div role="cell">
                        <StaffStatusChip status={s.status} />
                      </div>
                      <span role="cell" className="text-(--ap-faint)">
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </span>
                    </div>
                  ))}
                </div>
                <ul className={`${CARD_LIST} @min-[760px]:hidden`}>
                  {shown.map((s) => (
                    <li key={s.id} className={CARD_ITEM}>
                      <div className="flex items-center gap-2.5">
                        <AdminAvatar name={s.name} size={40} viewable />
                        <div className="min-w-0 flex-1 leading-tight">
                          <Link href={staffHref(s.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                            {s.name}
                          </Link>
                          <span className="block truncate text-[13px] text-(--ap-muted)">
                            {s.role} · {s.outlet}
                          </span>
                          <span className="block truncate text-[12px] text-(--ap-faint)">{s.reference}</span>
                        </div>
                        <StaffStatusChip status={s.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <ShowMore shown={shown.length} total={rows.length} onMore={batch.more} onClear={narrowing ? clear : null} />
        </>
      )}
    </Card>
  );
}

/** The real vacancies for this client (and outlet, on an outlet page): rows open the vacancy. */
export function VacanciesPanel({ clientId, outlet }: { clientId: string; outlet?: { id: string; name: string } }) {
  const live = useVacancies({ search: "", tab: "all", status: "", department: "", clientId, recruiterId: "", sort: "newest", page: 1, pageSize: 50 });
  const all = live.data?.rows ?? [];
  // Outlet ids differ between the vacancy and client mocks, so the outlet name is the fallback match.
  const rows = outlet ? all.filter((v) => v.outlet?.id === outlet.id || v.outlet?.name === outlet.name) : all;
  return (
    <Card
      title="Vacancies"
      right={
        <span className="flex flex-wrap items-center gap-2.5">
          <Link href={clientVacanciesHref(clientId)} className="text-[14px] font-bold text-(--ap-violet)">
            Open vacancies
          </Link>
          <Can cap="vacancy.create">
            <Link href={createVacancyForHref(clientId, outlet)} className="ap-btn ap-btn-p ap-btn-sm text-white!">
              <Plus className="size-4" aria-hidden="true" /> Create vacancy for this client
            </Link>
          </Can>
        </span>
      }
    >
      {live.status === "loading" ? (
        <div className="ap-shimmer h-[120px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading vacancies" />
      ) : live.status === "error" || live.status === "restricted" ? (
        <p className="text-[14px] text-(--ap-muted)">
          We could not load the vacancies.{" "}
          <button type="button" onClick={live.retry} className="font-bold text-(--ap-violet)">
            Try again
          </button>
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="No vacancies" description="Vacancies appear here when one is created." />
      ) : (
        <DataTable
          label="Vacancies"
          heads={outlet ? ["Vacancy", "Openings", "Closes", "Status"] : ["Vacancy", "Outlet", "Openings", "Closes", "Status"]}
          cols={outlet ? "@min-[560px]:grid-cols-[1.8fr_90px_120px_130px]" : "@min-[560px]:grid-cols-[1.6fr_1fr_90px_120px_130px]"}
          rows={rows.map((v) => {
            const title = (
              <Link key="t" href={vacancyHref(v.id)} className="font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {v.title}
              </Link>
            );
            const closes = <span key="c">Closes {formatDateShort(v.closesOn)}</span>;
            const chip = <VacancyStatusChip key="s" status={v.status} />;
            return { key: v.id, cells: outlet ? [title, v.openings, closes, chip] : [title, v.outlet?.name ?? "-", v.openings, closes, chip] };
          })}
        />
      )}
    </Card>
  );
}

export function ActivityPanel({ activity }: { activity: ActivityEntry[] }) {
  return (
    <Card title="Activity">
      {activity.length === 0 ? (
        <p className="text-[14px] text-(--ap-muted)">No changes recorded yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {activity.map((a) => (
            <li key={a.id} className="border-l-2 border-(--ap-tint-2) pl-3.5 text-[14px]">
              <b className="block break-words">{a.action}</b>
              <span className="text-(--ap-muted)">
                {a.actor} · {formatDateTime(a.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Pill tabs from tablet up, a dropdown on phones (same pattern as Staff 360). */
export function PageTabs<K extends string>({ label, tabs, value, onChange, idBase }: { label: string; tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void; idBase: string }) {
  return (
    <div className="mb-4">
      <div role="tablist" aria-label={label} className="hidden flex-wrap gap-1 rounded-xl border border-(--ap-line) bg-white/70 p-1 min-[768px]:flex">
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${idBase}-${t.key}`}
              aria-selected={on}
              aria-controls={`${idBase}-panel`}
              onClick={() => onChange(t.key)}
              className={`inline-flex h-10 items-center rounded-[9px] px-3.5 text-[14px] font-bold whitespace-nowrap transition-colors ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-muted) hover:bg-(--ap-tint) hover:text-(--ap-ink)"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-[768px]:hidden">
        <FilterDropdown label={label} prefix="Section" options={tabs} current={tabs.find((t) => t.key === value) ?? tabs[0]} onChange={onChange} />
      </div>
    </div>
  );
}

/** Assigned HR (primary and additional) with who assigned them and when. Read-only: assigning is done by Operations. */
export function AssignedHrCard({ hrUsers, history, what }: { hrUsers: { id: string; name: string; primary: boolean }[]; history: HrAssignmentEntry[]; what: string }) {
  const hasPrimary = hrUsers.some((h) => h.primary);
  return (
    <Card
      title="Assigned HR"
      right={
        <button type="button" disabled title="Assigning HR is done by Operations" aria-label="Change assigned HR. Assigning HR is done by Operations." className="ap-btn ap-btn-s ap-btn-sm">
          Change assigned HR
        </button>
      }
    >
      {!hasPrimary ? (
        <div className="mb-3 flex flex-col items-start gap-1.5">
          <NoHrChip />
          <p className="text-[14px] leading-snug text-(--ap-ink-2)">{NO_HR_LINE}</p>
        </div>
      ) : null}
      {hrUsers.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {hrUsers.map((h) => {
            const entry = history.find((x) => x.id === h.id);
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                <b className="text-[15px]">{h.name}</b>
                <StatusChip tone={h.primary ? "plum" : "mute"}>{h.primary ? "Primary" : "Additional"}</StatusChip>
                {entry ? (
                  <span className="text-(--ap-muted)">
                    assigned by {entry.assignedBy}, {formatDateTime(entry.at)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-3 text-[12px] text-(--ap-muted)">
        Assigning HR is done by Operations (who may assign needs Beeliv confirmation). One {what} can have several authorised HR users.
      </p>
    </Card>
  );
}
