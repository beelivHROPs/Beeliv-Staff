"use client";

import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";

/**
 * HR Inbox / Requests. Layout is driven by the WRAPPER's width (container
 * queries), not the viewport, so it holds whatever the sidebar / zoom do:
 *   >= 1200px  three columns: list | conversation | details
 *   >=  720px  two columns: list | conversation (Details button opens a drawer)
 *   <   720px  one pane: the list, then the case full-screen (/admin/inbox/[id])
 * Inbox, Notifications and Activity are three different things; this is only
 * the case-management inbox.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { CircleAlert, LockKeyhole, Mail, MessageSquareText, Search, X } from "@/components/applicant/icons";
import { ClientPageError } from "@/components/client/states";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ScopeEmpty, ScopeNote } from "@/components/admin/ScopeNote";
import { useAdminScope } from "@/lib/admin/scope";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { inboxActions, useInboxCase, useInboxList, useNeedsHome } from "@/lib/admin/inbox/hooks";
import { useCan } from "@/lib/admin/role-access";
import { setDevInboxRole, useDevInboxRole, type DevInboxRole } from "@/lib/admin/inbox/mock";
import type { InboxLoadStatus } from "@/lib/admin/inbox/hooks";
import { CaseDetails } from "./CaseDetails";
import { applyFilters, CaseList, CaseToolbar, DEFAULT_PREFS, filtersActive, type InboxPrefs, NO_FILTERS, type ListFilters, type ViewFilter } from "./CaseList";
import { CaseThread } from "./CaseThread";
import { NeedsHomeView } from "./NeedsHome";
import { DetailsSkeleton, ListSkeleton, ThreadSkeleton } from "./InboxSkeleton";

/** contain:paint clips a pane's scrolling content so it can never stretch the page. */
const PANE = "relative min-w-0 min-h-0 bg-white [contain:paint]";

function StatePanel({ status, retry, subject }: { status: InboxLoadStatus; retry: () => void; subject: string }) {
  if (status === "restricted") {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="You do not have access to this"
        description={`Your role cannot open ${subject}. If you think this is a mistake, contact a Beeliv administrator.`}
      />
    );
  }
  if (status === "notfound") {
    return (
      <EmptyState
        icon={Mail}
        title="Case not found"
        description="It may have been reassigned or is not in your queue."
        action={
          <Link href="/admin/inbox" className="ap-btn ap-btn-s">
            Back to inbox
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={CircleAlert}
      title="Something went wrong"
      description={`We could not load ${subject}. Check your connection and try again.`}
      action={
        <button type="button" onClick={retry} className="ap-btn ap-btn-p">
          Try again
        </button>
      }
    />
  );
}

function DevRole() {
  const role = useDevInboxRole();
  if (!SHOW_PROTOTYPE_CONTROLS) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-(--ap-muted)">Prototype role</span>
      <SelectMenu
        variant="compact"
        label="Prototype role"
        value={role}
        onChange={(v) => setDevInboxRole(v as DevInboxRole)}
        options={[
          { value: "hrManager", label: "HR Manager" },
          { value: "hrOfficer", label: "HR Officer" },
          { value: "none", label: "No inbox access" },
        ]}
        align="right"
      />
    </div>
  );
}

export function InboxBody({ caseId }: { caseId?: string }) {
  const list = useInboxList();
  const scope = useAdminScope();
  const [sel, setSel] = useState<string | null>(caseId ?? null);
  const [filters, setFilters] = useState<ListFilters>(NO_FILTERS);
  const [prefs, setPrefs] = useState<InboxPrefs>(DEFAULT_PREFS);
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState<"cases" | "needs-home">("cases");
  // Unmatched inbound email: Operations (or a delegated triage owner later). The server re-checks.
  const canTriage = useCan("inbox.triage");
  const needsHome = useNeedsHome(canTriage);
  const inNeedsHome = canTriage && view === "needs-home";
  const wrapRef = useRef<HTMLDivElement>(null);

  const one = useInboxCase(sel);
  const detail = one.data?.detail ?? null;

  // Opening a case marks it read (a silent refetch follows; no skeleton flash).
  const unreadOpen = detail?.unread ? detail.id : null;
  useEffect(() => {
    if (unreadOpen) void inboxActions.markRead(unreadOpen);
  }, [unreadOpen]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const all = useMemo(() => list.data?.cases ?? [], [list.data]);
  const meId = list.data?.me.id ?? null;
  const counts = useMemo<Partial<Record<ViewFilter, number>>>(() => ({ all: all.length, unread: all.filter((c) => c.unread).length, mine: all.filter((c) => c.assignedTo?.id === meId).length, unassigned: all.filter((c) => !c.assignedTo).length }), [all, meId]);
  const shown = useMemo(() => applyFilters(all, filters, meId), [all, filters, meId]);

  /** Wide: select in place. Narrow (single pane): let the link open the full-screen case page. */
  function onOpen(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const wide = (wrapRef.current?.offsetWidth ?? 0) >= 720;
    if (!wide || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    setSel(id);
  }

  const showCase = sel !== null;
  const listWorks = list.status === "ready";

  let listPane: React.ReactNode;
  if (list.status === "loading") listPane = <ListSkeleton />;
  else if (list.status === "ready") {
    listPane = (
      <>
        <CaseToolbar filters={filters} onChange={setFilters} counts={counts} prefs={prefs} onPrefs={setPrefs} />
        {shown.length === 0 ? (
          <EmptyState
            icon={Search}
            title={filters.q.trim() ? "No results" : "No cases match these filters"}
            description={filters.q.trim() ? `Nothing matches "${filters.q.trim()}".` : "Try a different view, category or status."}
            action={
              filtersActive(filters) ? (
                <button type="button" onClick={() => setFilters(NO_FILTERS)} className="ap-btn ap-btn-s ap-btn-sm">
                  <X className="size-4" aria-hidden="true" />
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <CaseList cases={shown} selectedId={sel} onOpen={onOpen} prefs={prefs} />
        )}
      </>
    );
  } else if (list.status === "empty") {
    listPane = <EmptyState icon={Mail} title="Your inbox is clear" description="New enquiries and support requests routed to you will appear here." />;
  } else if (list.status === "error") listPane = <ClientPageError title="Inbox / Requests" what="the inbox" retry={list.retry} />;
  else listPane = <StatePanel status={list.status} retry={list.retry} subject="the inbox" />;

  let threadPane: React.ReactNode;
  if (!showCase) {
    threadPane = (
      <div className="flex h-full items-center justify-center bg-(--ap-bg) p-6">
        <EmptyState icon={MessageSquareText} title="Select a case" description="Choose a case from the list to read the conversation and reply." />
      </div>
    );
  } else if (one.status === "loading") threadPane = <ThreadSkeleton />;
  else if (one.data && detail) {
    threadPane = <CaseThread detail={detail} permissions={one.data.permissions} assignees={one.data.assignees} detailsOpen={drawer} onBack={() => setSel(null)} onToggleDetails={() => setDrawer((d) => !d)} />;
  } else threadPane = <StatePanel status={one.status} retry={one.retry} subject="this case" />;

  const detailsPane = !showCase ? null : one.status === "loading" ? <DetailsSkeleton /> : one.data && detail ? <CaseDetails detail={detail} permissions={one.data.permissions} assignees={one.data.assignees} /> : null;

  // Whole-inbox failures replace the three-pane layout.
  const wholeFailure = list.status === "error" || list.status === "restricted" || list.status === "empty";

  return (
    <>
    <div ref={wrapRef} className={`@container mx-auto w-full max-w-[1760px] ${showCase ? "max-[719px]:h-full" : ""}`}>
      <div className={showCase ? "hidden @min-[720px]:block" : ""}>
        <PageHeading title="Inbox / Requests" right={<div className="max-[767px]:hidden"><DevRole /></div>} />
        <ScopeNote />
        {canTriage ? (
          <div role="tablist" aria-label="Inbox view" className="mb-3 flex gap-1.5">
            {(
              [
                ["cases", "Cases", null],
                ["needs-home", "Needs a home", needsHome.data?.length ?? null],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-bold ${view === key ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
              >
                {label}
                {n ? <span className={`tabular-nums ${view === key ? "text-white/85" : "text-(--ap-violet)"}`}>{n}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {showCase ? <h1 className="sr-only @min-[720px]:hidden">Inbox / Requests</h1> : null}

      {scope.none ? (
        <ScopeEmpty />
      ) : inNeedsHome ? (
        <div className="rounded-2xl border border-(--ap-line) bg-(--ap-bg) p-3 @min-[720px]:p-5">
          <NeedsHomeView state={needsHome} />
        </div>
      ) : wholeFailure ? (
        <div className="rounded-2xl border border-(--ap-line) bg-white py-6">{listPane}</div>
      ) : (
        <div
          className={`grid overflow-hidden ${showCase ? "max-[719px]:h-full max-[719px]:grid-rows-[minmax(0,1fr)] max-[719px]:rounded-none max-[719px]:border-0" : "max-[719px]:rounded-none max-[719px]:border-0 max-[719px]:bg-transparent"} rounded-2xl border border-(--ap-line) bg-(--ap-line) gap-px @min-[720px]:h-[calc(100dvh/var(--ps-zoom,1)-260px)] @min-[720px]:min-h-[520px] @min-[720px]:grid-rows-[minmax(0,1fr)] @min-[720px]:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] @min-[1200px]:grid-cols-[minmax(380px,420px)_minmax(0,1fr)_minmax(300px,340px)]`}
        >
          <section aria-label="Cases" className={`${PANE} ${showCase ? "hidden" : "block max-[719px]:bg-transparent"} overflow-y-auto @min-[720px]:block`}>
            {listPane}
          </section>
          <section aria-label="Conversation" className={`${PANE} overflow-hidden ${showCase ? "block h-full min-h-0 max-[719px]:h-full" : "hidden"} @min-[720px]:block @min-[720px]:h-auto`}>
            {threadPane}
          </section>
          <aside aria-label="Case details" className={`${PANE} hidden overflow-y-auto @min-[1200px]:block`}>
            {listWorks ? detailsPane : null}
          </aside>
        </div>
      )}
    </div>

    {/* Outside the container: container-type makes a containing block for fixed children. */}
      {drawer && detailsPane ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Case details">
          <button type="button" aria-label="Close details" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 right-0 flex w-[min(380px,100vw)] flex-col bg-white shadow-2xl max-[719px]:inset-x-0 max-[719px]:top-auto max-[719px]:max-h-[85dvh] max-[719px]:w-full max-[719px]:rounded-t-2xl max-[719px]:pb-[env(safe-area-inset-bottom,0px)]">
            <span className="mx-auto mt-2 hidden h-1 w-10 rounded-full bg-(--ap-line) max-[719px]:block" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-(--ap-line) px-4 py-3">
              <h2 className="m-0 text-[17px] font-extrabold">Case details</h2>
              <button type="button" autoFocus onClick={() => setDrawer(false)} className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-(--ap-line-2)" aria-label="Close details">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{detailsPane}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
