"use client";

/**
 * The three people lists on Team & Access: Internal team, Client users, and
 * Accounts (staff / applicant account lifecycle). One component, three
 * adapters. Actions: view history, suspend / deactivate / reactivate (reason,
 * then confirmAction), change client access, change entitlements. Which
 * actions show comes from the session's capabilities; the backend re-checks.
 *
 * Reused: listKit, ShowMore, SearchField + FilterSelect, FilterTabs, StatusChip,
 * RowMenu, AdminAvatar, EmptyState, ErrorPanel, confirmAction.
 */
import { useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ANY, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListToolbar, NoResults, TABLE_CARD, TH, useBatch, type FilterDef } from "@/components/admin/listKit";
import { ReasonSheet } from "@/components/admin/offers/Sheet";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Search, ShieldCheck } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { formatRelativePast } from "@/lib/applicant/time";
import { setAccountState, updateAccess, useAccessList, useTeamFacets, type AccessList } from "@/lib/admin/team-access/hooks";
import type { AccessPatch, AccessRow, AccountStatus, StateAction, TeamCapabilities } from "@/lib/admin/team-access/types";
import { AccessSheet, HistorySheet } from "./AccessSheets";
import { ACCOUNT_LABEL, ACCOUNT_ORDER, ACCOUNT_TONE, INVITATIONS_HREF } from "./meta";
import { Restricted } from "@/components/admin/offers/parts";

const COLS = "grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_40px]";

const COPY: Record<AccessList, { what: string; roleHead: string; scopeHead: string; search: string; facetLabel: string; emptyTitle: string; emptyText: string; icon: typeof ShieldCheck }> = {
  internal: { what: "internal users", roleHead: "Role", scopeHead: "Client and outlet scope", search: "Search name, email or role", facetLabel: "All roles", emptyTitle: "No internal users yet", emptyText: "Invite your first internal user. The first Head of Operations is created at deployment.", icon: ShieldCheck },
  clients: { what: "client users", roleHead: "Access level", scopeHead: "Client and outlets", search: "Search name, email or client", facetLabel: "All clients", emptyTitle: "No client users yet", emptyText: "Invite a client user once their organisation and outlets are set up.", icon: ShieldCheck },
  accounts: { what: "accounts", roleHead: "Entitlements", scopeHead: "Current assignment", search: "Search name or email", facetLabel: "All entitlements", emptyTitle: "No staff or applicant accounts yet", emptyText: "Applicants register themselves. Staff accounts are added when an accepted applicant is converted to staff.", icon: ShieldCheck },
};

const STATE_COPY: Record<StateAction, { title: (n: string) => string; description: string; confirm: string; tone: "caution" | "danger" | "neutral"; done: string; danger: boolean }> = {
  suspend: { title: (n) => `Suspend ${n}?`, description: "They cannot sign in while suspended. Their records and history are kept. You can reactivate the account later.", confirm: "Suspend", tone: "caution", done: "was suspended.", danger: true },
  deactivate: { title: (n) => `Deactivate ${n}?`, description: "The account is closed to sign-in. Records and history are kept and nothing is deleted.", confirm: "Deactivate", tone: "danger", done: "was deactivated.", danger: true },
  reactivate: { title: (n) => `Reactivate ${n}?`, description: "They can sign in again with the access they had before.", confirm: "Reactivate", tone: "neutral", done: "was reactivated.", danger: false },
};

export function PeopleList({ list, caps, onNotice }: { list: AccessList; caps: TeamCapabilities; onNotice: (n: { kind: "ok" | "error"; text: string }) => void }) {
  const copy = COPY[list];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [facet, setFacet] = useState("");
  const facets = useTeamFacets().data;
  const query = { search, status: status === "all" ? ("" as const) : status, facet };
  const live = useAccessList(list, query);
  const [last, setLast] = useState<typeof live.data>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const page = live.data ?? last;
  const { limit, more } = useBatch(`${list}|${search}|${status}|${facet}`);
  const [reasonFor, setReasonFor] = useState<{ row: AccessRow; action: StateAction } | null>(null);
  const [accessFor, setAccessFor] = useState<AccessRow | null>(null);
  const [historyFor, setHistoryFor] = useState<AccessRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const facetOptions =
    list === "internal"
      ? (facets?.roles ?? []).map((r) => ({ value: r.id, label: r.name }))
      : list === "clients"
        ? (facets?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))
        : [
            { value: "applicant", label: "Has Applicant" },
            { value: "staff", label: "Has Staff" },
            { value: "both", label: "Applicant and Staff" },
          ];
  const clear = () => {
    setSearch("");
    setStatus("all");
    setFacet("");
  };
  const facetFilter: FilterDef = { key: "facet", label: list === "internal" ? "Role" : list === "clients" ? "Client" : "Access", value: facet || ANY, onChange: (v) => setFacet(v === ANY ? "" : v), options: [{ value: ANY, label: copy.facetLabel }, ...facetOptions] };
  const narrowed = !!search || !!facet || status !== "all";

  if (live.status === "error") return <ErrorPanel title={`We could not load ${copy.what}`} retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="Team & Access" />;
  if (!page) return <div role="status" aria-busy="true" aria-label={`Loading ${copy.what}`} className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="ap-shimmer h-[72px] rounded-2xl" />)}</div>;
  if (page.workspaceEmpty) {
    return (
      <div className={EMPTY_CARD}>
        <EmptyState icon={copy.icon} title={copy.emptyTitle} description={copy.emptyText} />
      </div>
    );
  }

  function askState(row: AccessRow, action: StateAction) {
    setSheetError(null);
    setReasonFor({ row, action });
  }
  async function submitState(reason: string) {
    if (!reasonFor) return;
    const { row, action } = reasonFor;
    const c = STATE_COPY[action];
    const ok = await confirmAction({
      tone: c.tone,
      title: c.title(row.name),
      description: c.description,
      points: ["Your reason is recorded in the history with your name and the time."],
      confirmLabel: c.confirm,
    });
    if (!ok) return;
    setBusy(true);
    setSheetError(null);
    try {
      await setAccountState(row.id, action, reason);
      setReasonFor(null);
      onNotice({ kind: "ok", text: `${row.name} ${c.done}` });
    } catch {
      setSheetError("That did not go through. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submitAccess(patch: AccessPatch) {
    if (!accessFor) return;
    setBusy(true);
    setSheetError(null);
    try {
      await updateAccess(accessFor.id, patch);
      onNotice({ kind: "ok", text: `Access for ${accessFor.name} was updated.` });
      setAccessFor(null);
    } catch {
      setSheetError("That did not go through. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const menuFor = (r: AccessRow) => {
    const items = [{ label: "View history", onSelect: () => setHistoryFor(r) }] as { label: string; href?: string; onSelect?: () => void; tone?: "default" | "danger" }[];
    if (r.status === "invited") items.push({ label: "View invitation", href: `${INVITATIONS_HREF}` });
    if (caps.canChangeAccess && r.status !== "invited" && r.status !== "deactivated" && r.kind !== "internal") items.push({ label: r.kind === "client" ? "Change outlets and access" : "Change entitlements", onSelect: () => { setSheetError(null); setAccessFor(r); } });
    if (caps.canChangeState) {
      if (r.status === "active") {
        items.push({ label: "Suspend", onSelect: () => askState(r, "suspend") });
        items.push({ label: "Deactivate", tone: "danger", onSelect: () => askState(r, "deactivate") });
      } else if (r.status === "suspended") {
        items.push({ label: "Reactivate", onSelect: () => askState(r, "reactivate") });
        items.push({ label: "Deactivate", tone: "danger", onSelect: () => askState(r, "deactivate") });
      } else if (r.status === "deactivated") items.push({ label: "Reactivate", onSelect: () => askState(r, "reactivate") });
    }
    return <RowMenu label={`Actions for ${r.name}`} items={items} />;
  };

  const shown = page.rows.slice(0, limit);
  const refreshing = live.status === "loading";
  return (
    <div>
      <ListCard flat title={copy.what.charAt(0).toUpperCase() + copy.what.slice(1)} summary={`${page.total} ${page.total === 1 ? "person" : "people"}${narrowed ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel={`Filter ${copy.what} by status`}
        tabs={ACCOUNT_ORDER.map((st) => ({ key: st, label: st === "all" ? "All" : ACCOUNT_LABEL[st], count: page.statusCounts[st] }))}
        tab={status}
        onTab={(k: AccountStatus | "all") => setStatus(k)}
        search={{ value: search, onChange: setSearch, label: `Search ${copy.what}`, placeholder: copy.search }}
        groups={[{ key: "who", title: "Who", filters: [facetFilter] }]}
        tabChipLabel="Status"
        onClearFilters={() => {
          setStatus("all");
          setFacet("");
        }}
        resultCount={page.total}
        sort={null}
      />
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          narrowed ? (
            <NoResults
              noun={copy.what}
              filters={[facetFilter]}
              search={search}
              onClearSearch={() => setSearch("")}
              tab={status !== "all" ? { label: "Status", text: ACCOUNT_LABEL[status], onRemove: () => setStatus("all") } : null}
              onClear={clear}
            />
          ) : (
            <div className="py-6">
              <EmptyState icon={Search} title={`No ${copy.what} to show`} description="Nothing is listed here yet." />
            </div>
          )
        ) : (
          <>
            <div role="table" aria-label={copy.what} className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[860px]:block`}>
              <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
                <span role="columnheader" className={TH}>Name</span>
                <span role="columnheader" className={TH}>{copy.roleHead} / {copy.scopeHead}</span>
                <span role="columnheader" className={TH}>Status</span>
                <span role="columnheader" className="sr-only">Actions</span>
              </div>
              {shown.map((r) => (
                <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
                  <div role="cell" className="min-w-0"><Who r={r} /></div>
                  <div role="cell" className="min-w-0 leading-tight">
                    <span className="block truncate text-[14px] text-(--ap-ink-2)" title={r.roleLabel}>{r.roleLabel}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.scopeLabel}>{r.scopeLabel}</span>
                  </div>
                  <div role="cell" className="min-w-0">
                    <StatusChip tone={ACCOUNT_TONE[r.status]}>{ACCOUNT_LABEL[r.status]}</StatusChip>
                    <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">Last active {r.lastActiveAt ? formatRelativePast(r.lastActiveAt) : "never"}</span>
                  </div>
                  <div role="cell">{menuFor(r)}</div>
                </div>
              ))}
            </div>
            <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[860px]:hidden`}>
              {shown.map((r) => (
                <li key={r.id} className={CARD_ITEM}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1"><Who r={r} /></div>
                    {menuFor(r)}
                  </div>
                  <p className="mt-2 truncate text-[13px] text-(--ap-muted)" title={`${r.roleLabel}, ${r.scopeLabel}`}>
                    <b className="text-(--ap-ink-2)">{r.roleLabel}</b> · {r.scopeLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusChip tone={ACCOUNT_TONE[r.status]}>{ACCOUNT_LABEL[r.status]}</StatusChip>
                    <span className="text-[12px] text-(--ap-muted)">Last active {r.lastActiveAt ? formatRelativePast(r.lastActiveAt) : "never"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <ShowMore shown={limit} total={page.total} onMore={more} onClear={narrowed ? clear : null} />
      </ListCard>

      {reasonFor ? (
        <ReasonSheet
          title={STATE_COPY[reasonFor.action].title(reasonFor.row.name).replace("?", "")}
          description={STATE_COPY[reasonFor.action].description}
          label={`Reason for ${reasonFor.action === "reactivate" ? "reactivating" : reasonFor.action === "suspend" ? "suspending" : "deactivating"}`}
          confirmLabel="Continue"
          danger={STATE_COPY[reasonFor.action].danger}
          busy={busy}
          error={sheetError}
          onCancel={() => setReasonFor(null)}
          onSubmit={submitState}
        />
      ) : null}
      {accessFor ? <AccessSheet row={accessFor} busy={busy} error={sheetError} onCancel={() => setAccessFor(null)} onSubmit={submitAccess} /> : null}
      {historyFor ? <HistorySheet id={historyFor.id} name={historyFor.name} onClose={() => setHistoryFor(null)} /> : null}
    </div>
  );
}

function Who({ r }: { r: AccessRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AdminAvatar name={r.name} photoUrl={r.photoUrl} size={40} />
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-[15px] font-bold text-(--ap-ink)">{r.name}</span>
        {r.jobTitle ? <span className="mt-0.5 block truncate text-[13px] font-semibold text-(--ap-ink-2)" title={r.jobTitle}>{r.jobTitle}</span> : null}
        <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.email}>{r.email}</span>
      </div>
    </div>
  );
}
