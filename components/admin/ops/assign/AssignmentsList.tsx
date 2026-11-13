"use client";

/**
 * Operations "Clients & HR": which HR officer looks after each client.
 * Desktop: one container with a clean table (whole row opens the client, dots
 * menu for Assign / Reassign) beside a quiet "HR workload" container.
 * Phone: ONE container of avatar rows (HR avatar, client, one muted line) with
 * the dots menu as a bottom sheet; the workload is a second plain container.
 * One main button: "Assign HR". Filters live in the URL (Unassigned chip first).
 * States: loading, empty workspace, nothing matches, nothing unassigned, error,
 * restricted. Success is shown only after the adapter confirms.
 *
 * Reused: listKit (ListToolbar groups API, row classes), RowClick (whole-row
 * open), RowMenu (dots menu, phone bottom sheet), AdminAvatar, StatusChip,
 * OpsOnly (identity gate), PageHeading / EmptyState / ErrorPanel.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ANY, BODY_ROW, HEAD_ROW, ListToolbar, TH } from "@/components/admin/listKit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { ChevronRight, Plus, Search, UsersRound, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useAssignments } from "@/lib/admin/ops/assignments-hooks";
import type { AssignmentRow, AssignmentShow, AssignmentsPage, AssignmentsQuery, HrLoad } from "@/lib/admin/ops/assignments-types";
import { plural } from "@/lib/client/format";
import { AssignSheet, type AssignDone } from "./AssignSheet";
import { Banner, GROUP, GROUP_HEAD, MAIN_BTN, MUTED_NOTE, QUIET_BTN, ROW_LINE } from "./kit";
import { assignmentHref, ASSIGNMENTS_HREF, HrAvatar, NoHrChip } from "./parts";
import { Restricted } from "@/components/admin/vacancies/parts";

const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];
const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_96px_96px_40px_20px]";

export function AssignmentsList() {
  return (
    <OpsOnly what="Clients & HR" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

type Sheet = { clientId?: string } | null;

function Inner() {
  const url = useUrlParams();
  const rawShow = url.get("show");
  const query: AssignmentsQuery = { search: url.get("q"), show: rawShow === "unassigned" ? "unassigned" : "all", hrId: url.get("hr") };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [done, setDone] = useState<{ text: string } | null>(null);

  const live = useAssignments(query);
  const [last, setLast] = useState<AssignmentsPage | null>(null);
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
  const setHr = (v: string) => {
    setLimit(SHOW_MORE_STEP);
    url.set({ hr: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    setLimit(SHOW_MORE_STEP);
    url.set({ q: undefined, hr: undefined, show: undefined });
  };
  const narrowed = !!(query.search || query.hrId);

  const onDone = (r: AssignDone) => {
    setSheet(null);
    const hr = r.detail.hr?.name ?? "";
    setDone({ text: r.reassigned ? `Saved. ${r.detail.name} moved from ${r.previousHr} to ${hr}.` : `Saved. ${hr} now looks after ${r.detail.name}.` });
  };

  const main = (
    <button type="button" onClick={() => setSheet({})} className={MAIN_BTN}>
      <Plus className="size-4" aria-hidden="true" /> Assign HR
    </button>
  );
  const heading = <PageHeading title="Clients & HR" right={page && !page.workspaceEmpty ? main : undefined} />;

  if (live.status === "error") {
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load clients and HR" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading}
        <Restricted what="Clients & HR" />
      </>
    );
  }
  if (!page) return <Skeleton />;
  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <div className={`${GROUP} p-6 min-[768px]:p-8`}>
          <EmptyState icon={UsersRound} title="No clients yet" description="When HR invites a client, it appears here so you can assign an HR officer." />
        </div>
      </>
    );
  }

  const shown = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  const choose = (id: string) => setSheet({ clientId: id });

  return (
    <div>
      {heading}
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done.text}
        </Banner>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Clients" className="min-w-0">
          <ListToolbar
            tabsLabel="Show clients"
            tabs={[
              { key: "unassigned" as AssignmentShow, label: "Unassigned", count: page.counts.unassigned },
              { key: "all" as AssignmentShow, label: "All", count: page.counts.all },
            ]}
            tab={query.show}
            onTab={(k: AssignmentShow) => {
              setLimit(SHOW_MORE_STEP);
              url.set({ show: k === "all" ? undefined : k });
            }}
            search={{ value: searchText, onChange: onSearch, label: "Search clients", placeholder: "Search client or HR officer" }}
            groups={[{ key: "who", title: "HR officer", filters: [{ key: "hr", label: "HR officer", value: query.hrId || ANY, onChange: setHr, options: withAny("Any HR officer", page.facets.hr.map((h) => ({ value: h.id, label: h.name }))) }] }]}
            sort={null}
            resultCount={page.total}
            onClearFilters={() => url.set({ hr: undefined })}
          />

          <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
            {page.total === 0 ? (
              <div className={`${GROUP} py-6`}>
                {query.show === "unassigned" && !narrowed ? (
                  <EmptyState icon={UsersRound} title="Every client has an HR officer" description="Nothing is waiting for you here." />
                ) : (
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
                )}
              </div>
            ) : (
              <>
                <Table rows={shown} onAssign={choose} />
                <PhoneList rows={shown} onAssign={choose} />
              </>
            )}
          </div>
          <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed || query.show === "unassigned" ? clearAll : null} />
        </section>

        <Workload load={page.load} activeId={query.hrId} onPick={(id) => setHr(id === query.hrId ? "" : id)} />
      </div>

      {sheet ? <AssignSheet clientId={sheet.clientId} choices={sheet.clientId ? undefined : page.choices} onClose={() => setSheet(null)} onDone={onDone} /> : null}
    </div>
  );
}

function menuItems(r: AssignmentRow, onAssign: (id: string) => void) {
  return [{ label: r.hr ? "Reassign HR" : "Assign HR", onSelect: () => onAssign(r.id) }, { label: "Open client", href: assignmentHref(r.id) }];
}

function Table({ rows, onAssign }: { rows: AssignmentRow[]; onAssign: (id: string) => void }) {
  return (
    <div role="table" aria-label="Clients and their HR officers" className="hidden @min-[640px]:block">
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Client</span>
        <span role="columnheader" className={TH}>HR officer</span>
        <span role="columnheader" className={`${TH} text-right`}>Open jobs</span>
        <span role="columnheader" className={`${TH} text-right`}>Waiting</span>
        <span role="columnheader" className="sr-only">Actions</span>
        <span role="columnheader" className="sr-only">Open</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
          <div role="cell" className="min-w-0">
            <Link href={assignmentHref(r.id)} className="block text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
              {r.name}
            </Link>
            <span className="mt-0.5 block text-[12.5px] text-(--ap-muted)">{r.statusLabel}</span>
          </div>
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
          <span role="cell" className="text-right text-[14px] text-(--ap-ink-2) tabular-nums">{r.pendingItems}</span>
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

/** Phone: one container, avatar rows, a single muted line, dots menu as a bottom sheet. */
function PhoneList({ rows, onAssign }: { rows: AssignmentRow[]; onAssign: (id: string) => void }) {
  return (
    <ul className={`${GROUP} m-0 list-none p-0 @min-[640px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={`ad-clickrow flex min-h-[64px] items-center gap-3 pr-1 pl-3.5 ${ROW_LINE}`}>
          <HrAvatar hr={r.hr} size={40} />
          <div className="min-w-0 flex-1 py-2">
            <Link href={assignmentHref(r.id)} className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">
              {r.name}
            </Link>
            {r.hr ? (
              <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">
                {r.hr.name} · {r.openVacancies} open · {r.pendingItems} waiting
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

/** Quiet side summary: one row per HR officer. Choosing one filters the list. */
function Workload({ load, activeId, onPick }: { load: HrLoad[]; activeId: string; onPick: (hrId: string) => void }) {
  const maxClients = Math.max(1, ...load.map((l) => l.clients));
  return (
    <section aria-label="HR workload" className="min-w-0">
      <h2 className={GROUP_HEAD}>HR workload</h2>
      <div className={GROUP}>
        {load.map((l) => {
          const on = l.hr.id === activeId;
          return (
            <button key={l.hr.id} type="button" aria-pressed={on} onClick={() => onPick(l.hr.id)} className={`flex min-h-[64px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${ROW_LINE} ${on ? "bg-(--ap-tint)" : "hover:bg-(--ap-tint-soft)"}`}>
              <HrAvatar hr={l.hr} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] leading-tight font-semibold text-(--ap-ink)">{l.hr.name}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-(--ap-muted)">
                  {plural(l.clients, "client")} · {l.openVacancies} open · {l.pendingItems} waiting
                </span>
                <span aria-hidden="true" className="mt-1.5 block h-1 overflow-hidden rounded-full bg-(--ap-line-2)">
                  <span className="block h-full rounded-full bg-(--ap-violet)" style={{ width: `${(l.clients / maxClients) * 100}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className={`mt-2 px-1 ${MUTED_NOTE}`}>Tap an officer to see only their clients. What counts as a heavy load needs Beeliv confirmation.</p>
    </section>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-[14px]";
  return (
    <div role="status" aria-busy="true" aria-label="Loading clients and HR">
      <PageHeading title="Clients & HR" />
      <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className={`${sk} mb-3 h-9 w-56`} />
          <div className={`${sk} mb-3 h-11`} />
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${sk} h-16`} />
            ))}
          </div>
        </div>
        <div className={`${sk} h-52`} />
      </div>
    </div>
  );
}

export { ASSIGNMENTS_HREF, QUIET_BTN };
