"use client";

/**
 * Warnings and records (HR). List with status tabs (Issued / Acknowledged /
 * Disputed / Withdrawn), acknowledgement tracking, and the Issue warning sheet.
 * Who may issue a warning, and the warning ladder and severity levels, need
 * Beeliv confirmation: types and severities are adapter data. Acknowledgement
 * state matches the Staff app (acknowledgeStaffRecord marks it acknowledged).
 * Reused: FilterTabs, SearchField + FilterSelect, StatusChip, confirmAction,
 * NoticeBanner (interviews), ShowMore, AdminAvatar, EmptyState, ErrorPanel.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { NoticeBanner, type Notice } from "@/components/admin/interviews/ui";
import { ShowMore, SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListCard, ListToolbar, TABLE_CARD } from "@/components/admin/listKit";
import { DatePicker } from "@/components/applicant/form-fields";
import { FileText, Plus, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { todayISO } from "@/lib/client/format";
import { issueWarning, useWarnings } from "@/lib/admin/workforce/hooks";
import type { WarningInput, WarningOptions, WarningRow, WarningsPage, WarningsQuery, WarningTab } from "@/lib/admin/workforce/types";
import { ANY, FieldError, LABEL, SHEET_BTN, Sheet, StaffCell, TH, WarningStatusChip, dayLabelOf, scopeFilterDefs, useSearchCommit, warningHref, withAny } from "./parts";
import { EmptyCard, FailurePanel, ListSkeleton } from "./states";

const EMPTY_BY_TAB: Record<WarningTab, { title: string; description: string }> = {
  all: { title: "No warnings or records", description: "Warnings and records issued to staff show here." },
  issued: { title: "Nothing issued and waiting", description: "Records issued and not yet acknowledged show here." },
  acknowledged: { title: "No acknowledged records", description: "Records the staff member has acknowledged show here." },
  disputed: { title: "No disputed records", description: "Records a staff member has disputed show here." },
  withdrawn: { title: "No withdrawn records", description: "Records HR withdrew show here, with the reason." },
};

export function WarningsList() {
  const [query, setQuery] = useState<WarningsQuery>({ search: "", tab: "all", clientId: "", outletId: "", type: "", pageSize: SHOW_MORE_STEP });
  const live = useWarnings(query);
  const [shown, setShown] = useState<WarningsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [issuing, setIssuing] = useState(false);

  const patch = (p: Partial<WarningsQuery>) => setQuery((q) => ({ ...q, ...p, pageSize: SHOW_MORE_STEP }));
  const search = useSearchCommit((v) => patch({ search: v }));
  const filtered = !!(query.search || query.clientId || query.outletId || query.type);
  const clearAll = () => {
    search.clear();
    setQuery((q) => ({ ...q, search: "", clientId: "", outletId: "", type: "", pageSize: SHOW_MORE_STEP }));
  };

  if (live.status === "error" || live.status === "restricted") return <FailurePanel status={live.status} title="Warnings" what="Warnings and records" retry={live.retry} />;
  if (!page) return <ListSkeleton title="Warnings" />;

  const heading = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <PageHeading title="Warnings" />
      {page.canIssue ? (
        <button type="button" onClick={() => setIssuing(true)} className="ap-btn ap-btn-p h-11 text-white!">
          <Plus className="size-4" aria-hidden="true" /> Issue warning
        </button>
      ) : null}
    </div>
  );
  const sheet = issuing ? (
    <IssueSheet
      options={page.options}
      onClose={() => setIssuing(false)}
      onIssued={(name) => {
        setIssuing(false);
        setNotice({ kind: "ok", text: `A record was issued to ${name}. It is in their history.` });
        live.retry();
      }}
      onFailed={() => {
        setIssuing(false);
        setNotice({ kind: "error", text: "We could not issue the record. Nothing was changed. Please try again." });
      }}
    />
  ) : null;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
        <EmptyCard icon={FileText} title="No warnings or records yet" description="Warnings and records issued to staff at your clients and outlets show here, with whether the staff member has acknowledged them." />
        {sheet}
      </>
    );
  }

  const refreshing = live.status === "loading";
  const statusTabs = [
    { key: "all" as WarningTab, label: "All", count: page.tabCounts.all },
    { key: "issued" as WarningTab, label: "Issued", count: page.tabCounts.issued },
    { key: "acknowledged" as WarningTab, label: "Acknowledged", count: page.tabCounts.acknowledged },
    { key: "disputed" as WarningTab, label: "Disputed", count: page.tabCounts.disputed },
    { key: "withdrawn" as WarningTab, label: "Withdrawn", count: page.tabCounts.withdrawn },
  ];

  return (
    <div>
      {heading}
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <ListCard title="Warnings and records" summary={`${page.total} ${page.total === 1 ? "record" : "records"}${filtered ? " match your filters" : ""}`}>
      {/* Search first, then the ONE status pill row; Type, Client and Outlet live behind the Filters button (panel on desktop, sheet on phones). */}
      <ListToolbar
          tabsLabel="Filter warnings by status"
          tabs={statusTabs}
          tab={query.tab}
          onTab={(k: WarningTab) => patch({ tab: k })}
          sort={null}
          search={{ value: search.text, onChange: search.onChange, label: "Search warnings", placeholder: "Search staff, reference or type" }}
          groups={[
            { key: "type", title: "Type", filters: [{ key: "type", label: "Type", value: query.type || ANY, onChange: (v) => patch({ type: v === ANY ? "" : v }), options: withAny("All types", page.facets.types) }] },
            { key: "who-where", title: "Who / Where", filters: scopeFilterDefs(page.facets, query.clientId, query.outletId, (p) => patch(p)) },
          ]}
          onClearFilters={() => setQuery((q) => ({ ...q, type: "", clientId: "", outletId: "", pageSize: SHOW_MORE_STEP }))}
          resultCount={page.total}
        />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          filtered ? (
            <InCard
              icon={Search}
              title="No records match"
              description="No records in this tab match the current search and filters."
              action={
                <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                  <X className="size-4" aria-hidden="true" /> Clear search and filters
                </button>
              }
            />
          ) : (
            <InCard icon={FileText} {...EMPTY_BY_TAB[query.tab]} />
          )
        ) : (
          <>
            <Table rows={page.rows} />
            <Cards rows={page.rows} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={() => setQuery((q) => ({ ...q, pageSize: q.pageSize + SHOW_MORE_STEP }))} onClear={filtered ? clearAll : null} />
      <p className="mt-3 text-[13px] text-(--ap-muted)">Who may issue a warning, and the warning ladder, need Beeliv confirmation.</p>
      </ListCard>
      {sheet}
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

const COLS = "grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)]";

function Table({ rows }: { rows: WarningRow[] }) {
  return (
    <div role="table" aria-label="Warnings and records" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Record</span>
        <span role="columnheader">Staff</span>
        <span role="columnheader">Effective</span>
        <span role="columnheader">Status</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
          <div role="cell" className="min-w-0 leading-tight">
            <Link href={warningHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)" title={r.type}>
              {r.type}
            </Link>
            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{r.severity}</span>
            <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={r.reference}>
              {r.reference}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <StaffCell staff={r.staff} sub={r.outlet} />
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] text-(--ap-ink-2)">{dayLabelOf(r.effectiveDate)}</span>
            <span className="mt-0.5 block truncate text-[12px] text-(--ap-muted)" title={r.issuedBy}>
              By {r.issuedBy}
            </span>
          </div>
          <div role="cell" className="flex min-w-0 flex-col items-start gap-1">
            <WarningStatusChip status={r.status} />
            <span className="text-[12px] text-(--ap-muted)">{r.ack === "awaiting" ? "Awaiting staff" : r.ack === "acknowledged" ? "Acknowledged" : "No acknowledgement needed"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows }: { rows: WarningRow[] }) {
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
              <Link href={warningHref(r.id)} className="sr-only">
                Open record
              </Link>
              <StaffCell staff={r.staff} size={42} sub={`${r.type} · ${r.severity} · ${dayLabelOf(r.effectiveDate)}`} />
            </div>
            <span className="shrink-0">
              <WarningStatusChip status={r.status} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function IssueSheet({ options, onClose, onIssued, onFailed }: { options: WarningOptions; onClose: () => void; onIssued: (name: string) => void; onFailed: () => void }) {
  const uid = useId();
  const [f, setF] = useState<WarningInput>({ staffId: "", type: "", severity: "", details: "", effectiveDate: todayISO(), requiresAcknowledgement: true });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof WarningInput>(k: K, v: WarningInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const errors: Record<string, string> = {};
  if (!f.staffId) errors.staffId = "Choose a staff member.";
  if (!f.type) errors.type = "Choose a type.";
  if (!f.severity) errors.severity = "Choose a severity.";
  if (!f.details.trim()) errors.details = "Write what happened. The staff member can read this.";
  if (!f.effectiveDate) errors.effectiveDate = "Choose the effective date.";
  const show = (k: string) => (tried ? errors[k] : undefined);
  const person = options.staff.find((s) => s.id === f.staffId);

  async function submit() {
    setTried(true);
    if (Object.keys(errors).length) return;
    const ok = await confirmAction({
      tone: "caution",
      title: `Issue this record to ${person?.name ?? "the staff member"}?`,
      description: "It becomes part of their record and is shared with them.",
      points: [f.requiresAcknowledgement ? "They are asked to acknowledge it." : "No acknowledgement is requested.", "Your name and the time are written to the history."],
      confirmLabel: "Issue record",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await issueWarning({ ...f, details: f.details.trim() });
      onIssued(person?.name ?? "the staff member");
    } catch {
      onFailed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Issue warning"
      description="Who may issue a warning, and the warning ladder, need Beeliv confirmation."
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void submit()} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>
            {busy ? "Issuing..." : "Continue"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <span className={LABEL}>Staff member</span>
          <SelectMenu label="Staff member" placeholder="Choose staff" value={f.staffId} onChange={(v) => set("staffId", v)} options={options.staff.map((s) => ({ value: s.id, label: `${s.name} (${s.outlet})` }))} invalid={!!show("staffId")} />
          <FieldError>{show("staffId")}</FieldError>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
          <div>
            <span className={LABEL}>Type</span>
            <SelectMenu label="Type" placeholder="Choose a type" value={f.type} onChange={(v) => set("type", v)} options={options.types} invalid={!!show("type")} />
            <FieldError>{show("type")}</FieldError>
          </div>
          <div>
            <span className={LABEL}>Severity</span>
            <SelectMenu label="Severity" placeholder="Choose severity" value={f.severity} onChange={(v) => set("severity", v)} options={options.severities} invalid={!!show("severity")} />
            <FieldError>{show("severity")}</FieldError>
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-d`} className={LABEL}>
            Effective date
          </label>
          <DatePicker id={`${uid}-d`} title="Effective date" value={f.effectiveDate} onChange={(v) => set("effectiveDate", v)} invalid={!!show("effectiveDate")} />
          <FieldError>{show("effectiveDate")}</FieldError>
        </div>
        <div>
          <label htmlFor={`${uid}-t`} className={LABEL}>
            Details
          </label>
          <textarea id={`${uid}-t`} className="ap-input" rows={5} maxLength={2000} value={f.details} onChange={(e) => set("details", e.target.value)} aria-invalid={!!show("details")} />
          <FieldError>{show("details")}</FieldError>
        </div>
        <label className="flex items-start gap-3 text-[14px] text-(--ap-ink-2)">
          <input type="checkbox" className="mt-1 size-4" checked={f.requiresAcknowledgement} onChange={(e) => set("requiresAcknowledgement", e.target.checked)} />
          <span>Ask the staff member to acknowledge this record. They confirm in the Staff app.</span>
        </label>
      </div>
    </Sheet>
  );
}
