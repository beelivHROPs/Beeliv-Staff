"use client";

/**
 * Assignments (HR, spec 9 / 28.3): staff <-> client / outlet / role / department
 * with start date and history. One StaffAssignment record per placement; the
 * directory, Staff 360 and this page all read the same record (never copies).
 * Reuses: ClientAvatar, StatusChip, SearchField, FilterSelect, EmptyState,
 * PageHeading, confirmAction, SelectMenu, ClientPageSkeleton/Error.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Plus, Search, X } from "@/components/applicant/icons";
import { Store } from "@/components/client/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ListCard, ListToolbar, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { cmpIso } from "@/lib/admin/sort";
import { StatusChip } from "@/components/client/StatusChip";
import { formatDate, formatDateShort } from "@/lib/applicant/time";
import { assignStaff, useAssignments } from "@/lib/admin/staff/hooks";
import type { AssignInput, AssignmentRow, AssignmentsPage } from "@/lib/admin/staff/types";
import { AssignSheet } from "./AssignSheet";
import { ANY, AdminState, staffHref, useUrlParams, withAny } from "./parts";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
];

export function AssignmentsView() {
  const url = useUrlParams();
  const query = { search: url.get("q"), clientId: url.get("client") };
  const sort = SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "newest";
  const batch = useBatch([query.search, query.clientId, sort].join("|"));
  const live = useAssignments(query);
  const [shown, setShown] = useState<AssignmentsPage | null>(null);
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

  // ?reassign=<staffId> (from Staff 360) opens the sheet once; closing clears it.
  const reassignParam = url.get("reassign");
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [handled, setHandled] = useState("");
  if (reassignParam && reassignParam !== handled && page) {
    setHandled(reassignParam);
    setSheetFor(reassignParam);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const close = () => {
    setSheetFor(null);
    setError(null);
    if (reassignParam) url.set({ reassign: undefined });
  };

  async function submit(input: AssignInput) {
    const ok = await confirmAction({
      tone: "neutral",
      title: "Confirm this assignment?",
      description: "The current assignment ends and the new one starts on the date you chose. Both stay in the history with your reason.",
      confirmLabel: "Confirm",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await assignStaff(input);
      setDone("Assignment saved. The history has been updated.");
      live.retry();
      close();
    } catch {
      setError("That could not be saved. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  const narrowing = !!(query.search || query.clientId);
  // Compared on the full assignment start timestamp; people awaiting assignment have none and sort last.
  const sorted = [...(page?.rows ?? [])].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : cmpIso(a.current?.start, b.current?.start, sort === "oldest" ? "asc" : "desc")));

  return (
    <AdminState status={page ? "ready" : live.status} title="Assignments" what="assignments" retry={live.retry}>
      {!page ? null : (
        <div>
          <PageHeading
            title="Assignments"
            right={
              !page.workspaceEmpty || page.facets.clients.length ? (
                <button type="button" className="ap-btn ap-btn-p h-11 px-5 text-[15px] font-semibold text-white!" onClick={() => setSheetFor("")}>
                  <Plus className="size-4" aria-hidden="true" /> Assign / Reassign
                </button>
              ) : undefined
            }
          />
          {done ? (
            <p role="status" className="mb-3 rounded-xl bg-(--ap-ok-bg) px-4 py-2.5 text-[14px] font-semibold text-(--ap-ok)">
              {done}
            </p>
          ) : null}
          {page.workspaceEmpty ? (
            <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
              <EmptyState icon={Store} title="No assignments yet" description="Approved staff appear here, awaiting a client and outlet." />
            </div>
          ) : (
            <>
              <ListCard title="Assignments" summary={`${page.rows.length} ${page.rows.length === 1 ? "person" : "people"}${narrowing ? " match your filters" : ""}`}>
              <ListToolbar
                tabsLabel="Assignments"
                search={{ value: searchText, onChange: onSearch, label: "Search assignments", placeholder: "Search name, reference, client or outlet" }}
                filters={[{ key: "client", label: "Client", value: query.clientId || ANY, onChange: (v) => url.set({ client: v === ANY ? undefined : v }), options: withAny("All clients", page.facets.clients.map((c) => ({ value: c.id, label: c.name }))) }]}
                sort={{ value: sort, options: SORTS, onChange: (v) => url.set({ sort: v === "newest" ? undefined : v }) }}
              />
              <div className={`@container transition-opacity ${live.status === "loading" ? "opacity-60" : ""}`}>
                {page.rows.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      icon={Search}
                      title="No assignments match"
                      description="Try a different name, reference or client."
                      action={
                        narrowing ? (
                          <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={() => { setSearchText(""); url.set({ q: undefined, client: undefined }); }}>
                            <X className="size-4" aria-hidden="true" /> Clear search and filters
                          </button>
                        ) : undefined
                      }
                    />
                  </div>
                ) : (
                  <ul className="m-0 flex list-none flex-col p-0">
                    {sorted.slice(0, batch.limit).map((r) => (
                      <Row key={r.staffId} r={r} onReassign={() => setSheetFor(r.staffId)} />
                    ))}
                  </ul>
                )}
              </div>
              <ShowMore shown={Math.min(batch.limit, sorted.length)} total={sorted.length} onMore={batch.more} onClear={narrowing ? () => { setSearchText(""); url.set({ q: undefined, client: undefined }); } : null} />
              </ListCard>
            </>
          )}
          {sheetFor !== null ? <AssignSheet people={page.rows} facets={page.facets} initialStaffId={sheetFor} busy={busy} error={error} onCancel={close} onSubmit={submit} /> : null}
        </div>
      )}
    </AdminState>
  );
}

function Row({ r, onReassign }: { r: AssignmentRow; onReassign: () => void }) {
  const c = r.current;
  return (
    <li className="min-w-0 border-t border-(--ap-line-2) px-2 py-3 first:border-t-0 @min-[760px]:min-h-[68px]">
      <div className="flex flex-col gap-3 @min-[760px]:flex-row @min-[760px]:items-center @min-[760px]:gap-5">
        <div className="flex min-w-0 items-center gap-3 @min-[760px]:w-[32%]">
          <AdminAvatar name={r.name} size={40} viewable />
          <div className="min-w-0 leading-tight">
            {c ? (
              <Link href={staffHref(r.staffId)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
            ) : (
              <b className="block truncate text-[15px]">{r.name}</b>
            )}
            <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={r.reference}>{r.reference}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 text-[14px] leading-tight">
          {c ? (
            <>
              <b className="block truncate" title={`${c.client}, ${c.outlet}`}>
                {c.client}, {c.outlet}
              </b>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${c.role} · ${c.department}`}>
                {c.role} · {c.department}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">Since {formatDate(c.start)}</span>
            </>
          ) : (
            <StatusChip tone="warn">Awaiting assignment</StatusChip>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {c ? <StatusChip tone="ok">Current</StatusChip> : null}
          <button type="button" onClick={onReassign} className="ap-btn ap-btn-s ap-btn-sm h-10">
            {c ? "Reassign" : "Assign"}
          </button>
        </div>
      </div>
      {r.history.length > 0 ? (
        <details className="mt-3 border-t border-(--ap-line-2) pt-2.5">
          <summary className="cursor-pointer text-[13px] font-bold text-(--ap-violet)">History ({r.history.length})</summary>
          <ul className="mt-2.5 flex flex-col gap-2">
            {r.history.map((h) => (
              <li key={h.id} className="border-l-2 border-(--ap-tint-2) pl-3.5 text-[14px] leading-snug">
                <b className="block break-words">
                  {h.client}, {h.outlet} · {h.role}
                </b>
                <span className="text-(--ap-muted)">
                  {formatDateShort(h.start)} - {h.end ? formatDateShort(h.end) : "present"}
                  {h.reason ? ` · ${h.reason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}
