"use client";

/**
 * Leave requests queue (HR). Tabs: Pending / Approved / Declined / Cancelled.
 * Approve and decline go through confirmAction; decline needs a reason; every
 * decision is written to the request's history. Who may approve leave needs
 * Beeliv confirmation: the adapter's canApprove flag decides whether the
 * decision buttons show. Balance is shown only when the adapter supplies it
 * (the Staff app shows the same figure); the UI never computes entitlement.
 * Reused: FilterTabs, SearchField + FilterSelect, StatusChip, confirmAction,
 * NoticeBanner (interviews), ShowMore, Disc, AdminAvatar, EmptyState.
 */
import { useState } from "react";
import { NoticeBanner, type Notice } from "@/components/admin/interviews/ui";
import { Disc } from "@/components/admin/overview/Disc";
import { ShowMore, SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FilterTabs } from "@/components/applicant/FilterTabs";
import { CARD_LIST, HEAD_ROW, ListCard, ListTabs, ListToolbar, NoResults, TABLE_CARD, type FilterDef } from "@/components/admin/listKit";
import { Check, DoorOpen, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import { approveLeave, declineLeave, useLeave } from "@/lib/admin/workforce/hooks";
import type { LeavePage, LeaveQuery, LeaveRow, LeaveTab } from "@/lib/admin/workforce/types";
import { ANY, Fact, HistoryList, LeaveStatusChip, NoteSheet, scopeFilterDefs, SHEET_BTN, Sheet, StaffCell, TH, DT, leaveRange, stamp, useSearchCommit, withAny } from "./parts";
import { EmptyCard, FailurePanel, ListSkeleton } from "./states";
import { WhoIsOff } from "./WhoIsOff";

const EMPTY_BY_TAB: Record<LeaveTab, { title: string; description: string }> = {
  pending: { title: "No leave requests waiting", description: "Requests from staff that need a decision show here." },
  approved: { title: "No approved leave", description: "Requests that have been approved show here." },
  declined: { title: "No declined requests", description: "Requests that were declined, with the reason, show here." },
  cancelled: { title: "No cancelled requests", description: "Requests staff cancelled show here." },
};

export function LeaveQueue() {
  const [query, setQuery] = useState<LeaveQuery>({ search: "", tab: "pending", clientId: "", outletId: "", type: "", pageSize: SHOW_MORE_STEP });
  const live = useLeave(query);
  const [shown, setShown] = useState<LeavePage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [declining, setDeclining] = useState<LeaveRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"requests" | "off">("requests");

  const patch = (p: Partial<LeaveQuery>) => setQuery((q) => ({ ...q, ...p, pageSize: SHOW_MORE_STEP }));
  const search = useSearchCommit((v) => patch({ search: v }));
  const filtered = !!(query.search || query.clientId || query.outletId || query.type);
  const clearAll = () => {
    search.clear();
    setQuery((q) => ({ ...q, search: "", clientId: "", outletId: "", type: "", pageSize: SHOW_MORE_STEP }));
  };

  if (live.status === "error" || live.status === "restricted") return <FailurePanel status={live.status} title="Leave" what="Leave requests" retry={live.retry} />;
  if (!page) return <ListSkeleton title="Leave" />;
  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Leave" />
        <ScopeNote />
        <ScopeGate>
          <EmptyCard icon={DoorOpen} title="No leave requests yet" description="Requests from staff at your clients and outlets show here for a decision." />
        </ScopeGate>
      </>
    );
  }

  const typeFilter: FilterDef = { key: "type", label: "Leave type", value: query.type || ANY, onChange: (v) => patch({ type: v === ANY ? "" : v }), options: withAny("All leave types", page.facets.types) };
  const scopeFilters = scopeFilterDefs(page.facets, query.clientId, query.outletId, (p) => patch(p));
  const filterDefs = [typeFilter, ...scopeFilters];
  const open = page.rows.find((r) => r.id === review) ?? null;

  async function approve(r: LeaveRow) {
    const ok = await confirmAction({
      tone: "neutral",
      title: `Approve ${r.type.toLowerCase()} for ${r.staff.name}?`,
      description: `${leaveRange(r.startDate, r.endDate)} (${r.days} ${r.days === 1 ? "day" : "days"}).`,
      points: ["The staff member is told the request was approved.", "Your name and the time are written to the history."],
      confirmLabel: "Approve",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await approveLeave(r.id);
      setNotice({ kind: "ok", text: `${r.staff.name}'s leave was approved.`, sound: "approved" });
      setReview(null);
      live.retry();
    } catch {
      setNotice({ kind: "error", text: "We could not approve the request. Nothing was changed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function decline(r: LeaveRow, reason: string) {
    const ok = await confirmAction({
      tone: "danger",
      title: `Decline ${r.staff.name}'s request?`,
      description: "The staff member is told it was declined and sees your reason.",
      points: ["Your reason is written to the history."],
      confirmLabel: "Decline request",
      cancelLabel: "Go back",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await declineLeave(r.id, { reason });
      setNotice({ kind: "ok", text: `${r.staff.name}'s request was declined.`, sound: "rejected" });
      setDeclining(null);
      setReview(null);
      live.retry();
    } catch {
      setNotice({ kind: "error", text: "We could not decline the request. Nothing was changed. Please try again." });
      setDeclining(null);
    } finally {
      setBusy(false);
    }
  }

  const refreshing = live.status === "loading";

  return (
    <div>
      <PageHeading title="Leave" />
      <ScopeNote />
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <FilterTabs
        label="Leave view"
        className={view === "requests" ? "mb-4 max-[767px]:hidden" : "mb-4"}
        options={[
          { key: "requests", label: "Requests" },
          { key: "off", label: "Who's off" },
        ]}
        value={view}
        onChange={(k: "requests" | "off") => setView(k)}
      />

      {view === "off" ? (
        <WhoIsOff
          onViewRequest={(id) => {
            setQuery((q) => ({ ...q, search: "", clientId: "", outletId: "", type: "", tab: "approved", pageSize: 200 }));
            search.clear();
            // Stay on "Who's off": the request opens in its sheet over this tab (no redirect to Requests).
            setReview(id);
          }}
        />
      ) : (
        <ListCard title="Leave requests" summary={`${page.total} ${page.total === 1 ? "request" : "requests"}${filtered ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter leave requests by status"
        tabs={[
          { key: "pending", label: "Pending", count: page.tabCounts.pending },
          { key: "approved", label: "Approved", count: page.tabCounts.approved },
          { key: "declined", label: "Declined", count: page.tabCounts.declined },
          { key: "cancelled", label: "Cancelled", count: page.tabCounts.cancelled },
        ]}
        tab={query.tab}
        onTab={(k: LeaveTab) => patch({ tab: k })}
        tabsInSheet
        phoneTop={<ListTabs label="Leave view" tabs={[{ key: "requests" as const, label: "Requests", count: page.tabCounts.pending }, { key: "off" as const, label: "Who's off" }]} value={view} onChange={(k) => setView(k)} />}
        sort={null}
        search={{ value: search.text, onChange: search.onChange, label: "Search leave requests", placeholder: "Search staff, outlet or leave type" }}
        groups={[
          { key: "type", title: "Type", filters: [typeFilter] },
          { key: "who-where", title: "Who / Where", filters: scopeFilters },
        ]}
        onClearFilters={() => setQuery((q) => ({ ...q, type: "", clientId: "", outletId: "", pageSize: SHOW_MORE_STEP }))}
        resultCount={page.total}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          filtered ? (
            <NoResults
              noun="leave requests"
              filters={filterDefs}
              search={query.search}
              onClearSearch={() => {
                search.clear();
                patch({ search: "" });
              }}
              onClear={clearAll}
            />
          ) : (
            <InCard icon={DoorOpen} {...EMPTY_BY_TAB[query.tab]} />
          )
        ) : (
          <>
            <Table rows={page.rows} onReview={setReview} />
            <Cards rows={page.rows} onReview={setReview} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={() => setQuery((q) => ({ ...q, pageSize: q.pageSize + SHOW_MORE_STEP }))} onClear={filtered ? clearAll : null} />
      <p className="mt-3 text-[13px] text-(--ap-muted) max-[767px]:hidden">Who may approve or decline leave needs Beeliv confirmation.{page.canApprove ? "" : " Your account can view requests but not decide them."}</p>
        </ListCard>
      )}

      {open ? (
        <ReviewSheet
          r={open}
          canApprove={page.canApprove}
          busy={busy}
          onClose={() => setReview(null)}
          onApprove={() => void approve(open)}
          onDecline={() => setDeclining(open)}
        />
      ) : null}
      {declining ? (
        <NoteSheet
          title={`Decline ${declining.staff.name}'s request`}
          description="Tell the staff member why. They see this reason."
          label="Reason for declining"
          confirmLabel="Continue"
          danger
          busy={busy}
          onCancel={() => setDeclining(null)}
          onSubmit={(reason) => void decline(declining, reason)}
        />
      ) : null}
    </div>
  );
}

function InCard(p: Parameters<typeof EmptyCard>[0]) {
  return (
    <div className="py-6">
      <EmptyState icon={p.icon} title={p.title} description={p.description} action={p.action} />
    </div>
  );
}

const ROW = "min-h-[68px] border-t border-(--ap-line-2) px-2 py-2 hover:bg-(--ap-tint-soft)";
const COLS = "grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_92px]";

function Balance({ r }: { r: LeaveRow }) {
  return r.balance ? <>{r.balance.remaining} {r.balance.unit} left</> : <span className="text-(--ap-faint)">Balance not shown</span>;
}

const daysText = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

function Table({ rows, onReview }: { rows: LeaveRow[]; onReview: (id: string) => void }) {
  return (
    <div role="table" aria-label="Leave requests" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Staff</span>
        <span role="columnheader">Request</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${ROW}`}>
          <div role="cell" className="min-w-0">
            <StaffCell staff={r.staff} sub={r.outlet} />
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] font-semibold text-(--ap-ink-2)">{r.type}</span>
            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted) tabular-nums">
              {leaveRange(r.startDate, r.endDate)} · {daysText(r.days)}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <LeaveStatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{r.decidedBy ? `By ${r.decidedBy}` : <Balance r={r} />}</span>
          </div>
          <div role="cell" className="text-right">
            <button type="button" onClick={() => onReview(r.id)} className="ap-btn ap-btn-s ap-btn-sm h-9">
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, onReview }: { rows: LeaveRow[]; onReview: (id: string) => void }) {
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className="border-t border-(--ap-line-2) py-2.5 first:border-t-0">
          {/* Phone: two lines. Pending rows show a quiet text "Review"; decided rows show their status. */}
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <StaffCell staff={r.staff} sub={`${r.type} · ${leaveRange(r.startDate, r.endDate)} · ${daysText(r.days)}`} size={36} />
            </div>
            {r.status === "pending" ? (
              <button type="button" onClick={() => onReview(r.id)} className="ap-hit inline-flex min-h-10 shrink-0 items-center px-1 text-[14px] font-bold text-(--ap-violet)">
                Review
              </button>
            ) : (
              <>
                <LeaveStatusChip status={r.status} />
                <button type="button" onClick={() => onReview(r.id)} className="ap-hit inline-flex min-h-10 shrink-0 items-center px-1 text-[14px] font-bold text-(--ap-violet)">
                  View
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReviewSheet({ r, canApprove, busy, onClose, onApprove, onDecline }: { r: LeaveRow; canApprove: boolean; busy: boolean; onClose: () => void; onApprove: () => void; onDecline: () => void }) {
  const decidable = r.status === "pending" && canApprove;
  return (
    <Sheet
      title={`${r.type}: ${r.staff.name}`}
      description={`${leaveRange(r.startDate, r.endDate)}, ${r.days} ${r.days === 1 ? "day" : "days"}`}
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Close
          </button>
          {decidable ? (
            <>
              <button type="button" disabled={busy} onClick={onDecline} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
                <X className="size-4" aria-hidden="true" /> Decline
              </button>
              <button type="button" disabled={busy} onClick={onApprove} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>
                <Check className="size-4" aria-hidden="true" /> Approve
              </button>
            </>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Disc icon={DoorOpen} />
          <div className="min-w-0 flex-1">
            <StaffCell staff={r.staff} sub={`${r.outlet}, ${r.client}`} size={32} />
          </div>
          <LeaveStatusChip status={r.status} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-[14px]">
          <Fact label="Submitted" value={stamp(r.submittedAt)} />
          <Fact label="Balance" value={<Balance r={r} />} />
          <Fact label="Decided by" value={r.decidedBy ?? "Not decided"} />
          <Fact label="Attachment" value={r.attachmentName ?? "None"} />
        </dl>
        <div>
          <p className={DT}>Reason given</p>
          <p className="mt-1 text-[14px] text-(--ap-ink-2)">{r.reason ?? "No reason given."}</p>
        </div>
        {r.decisionNote ? (
          <div>
            <p className={DT}>Decision note</p>
            <p className="mt-1 text-[14px] text-(--ap-ink-2)">{r.decisionNote}</p>
          </div>
        ) : null}
        {r.status === "pending" && !canApprove ? <p className="text-[13px] text-(--ap-muted)">Your account cannot decide leave. Who may needs Beeliv confirmation.</p> : null}
        <div>
          <p className={`${DT} mb-2`}>Activity history</p>
          <HistoryList history={r.history} empty="No history yet." />
        </div>
      </div>
    </Sheet>
  );
}
