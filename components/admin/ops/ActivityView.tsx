"use client";

/**
 * Operations Activity (audit viewer): a calm, read-only list of who did what and
 * when, newest first, grouped by day. Search plus one Filters button (the shared
 * listKit toolbar: actor, action, record type, date). A row opens a small detail
 * sheet (who, when, what changed, note, reference). Nothing here can be edited
 * or deleted, and no NIN, bank or pay value is ever shown: a protected record
 * only says its details are hidden. States: loading, empty, nothing matches,
 * error, restricted.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ANY, ListToolbar, NoResults, type FilterGroup } from "@/components/admin/listKit";
import { CancelButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { ChevronRight, FileCheck2, LockKeyhole } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useActivity } from "@/lib/admin/ops/activity-hooks";
import type { ActivityAction, ActivityEntityType, ActivityEvent, ActivityQuery, ActivityRange } from "@/lib/admin/ops/activity-types";
import { Facts, OpsOnly, Restricted } from "./parts";

const ACTION_LABEL: Record<ActivityAction, string> = { approved: "Approved", "sent-back": "Sent back", rejected: "Rejected", invited: "Invited", assigned: "Assigned", published: "Published", verified: "Verified", revealed: "Revealed", viewed: "Viewed" };
/** Verb used inside the sentence "Adaeze approved ...". */
const VERB: Record<ActivityAction, string> = { approved: "approved", "sent-back": "sent back", rejected: "rejected", invited: "invited", assigned: "assigned", published: "published", verified: "verified", revealed: "revealed", viewed: "viewed" };
const TYPE_LABEL: Record<ActivityEntityType, string> = { approval: "Approvals", invitation: "Invitations", client: "Clients", vacancy: "Vacancies", document: "Documents", agreement: "Agreements" };
const TYPE_ONE: Record<ActivityEntityType, string> = { approval: "Approval", invitation: "Invitation", client: "Client", vacancy: "Vacancy", document: "Document", agreement: "Agreement" };
const RANGE_LABEL: Record<Exclude<ActivityRange, "">, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

const isAction = (v: string): v is ActivityAction => v in ACTION_LABEL;
const isType = (v: string): v is ActivityEntityType => v in TYPE_LABEL;
const isRange = (v: string): v is Exclude<ActivityRange, ""> => v in RANGE_LABEL;

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
const fullWhen = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function dayHeading(iso: string): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function ActivityView() {
  return (
    <OpsOnly what="Activity" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const url = useUrlParams();
  const a = url.get("action");
  const t = url.get("type");
  const r = url.get("range");
  const query: ActivityQuery = { search: url.get("q"), action: isAction(a) ? a : "", actorId: url.get("actor"), entityType: isType(t) ? t : "", range: isRange(r) ? r : "" };
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  const [open, setOpen] = useState<ActivityEvent | null>(null);

  const live = useActivity(query);
  const [last, setLast] = useState<typeof live.data>(null);
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
  const setFilter = (key: string, v: string) => {
    setLimit(SHOW_MORE_STEP);
    url.set({ [key]: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    setLimit(SHOW_MORE_STEP);
    url.set({ q: undefined, action: undefined, actor: undefined, type: undefined, range: undefined });
  };

  const heading = <PageHeading title="Activity" />;
  if (live.status === "error") {
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load the activity" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading}
        <Restricted what="Activity" />
      </>
    );
  }
  if (!page) return <Skeleton />;

  if (page.workspaceEmpty) {
    return (
      <div className="ops-calm">
        {heading}
        <div className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-6">
          <EmptyState icon={FileCheck2} title="No activity yet" description="Approvals, invitations, assignments, published jobs and verified documents are recorded here as they happen." />
        </div>
      </div>
    );
  }

  const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];
  const groups: FilterGroup[] = [
    {
      key: "who",
      title: "Who",
      filters: [{ key: "actor", label: "Person", value: query.actorId || ANY, onChange: (v) => setFilter("actor", v), control: "select", options: withAny("Anyone", page.facets.actors.map((x) => ({ value: x.id, label: x.name }))) }],
    },
    {
      key: "what",
      title: "What",
      filters: [
        { key: "action", label: "Action", value: query.action || ANY, onChange: (v) => setFilter("action", v), options: withAny("Any action", (Object.keys(ACTION_LABEL) as ActivityAction[]).map((k) => ({ value: k, label: ACTION_LABEL[k] }))) },
        { key: "type", label: "Record", value: query.entityType || ANY, onChange: (v) => setFilter("type", v), options: withAny("Any record", (Object.keys(TYPE_LABEL) as ActivityEntityType[]).map((k) => ({ value: k, label: TYPE_LABEL[k] }))) },
      ],
    },
    {
      key: "when",
      title: "When",
      filters: [{ key: "range", label: "Date", value: query.range || ANY, onChange: (v) => setFilter("range", v), options: withAny("Any time", (Object.keys(RANGE_LABEL) as Exclude<ActivityRange, "">[]).map((k) => ({ value: k, label: RANGE_LABEL[k] }))) }],
    },
  ];
  const narrowed = !!(query.search || query.action || query.actorId || query.entityType || query.range);
  const flat = groups.flatMap((g) => g.filters);
  const refreshing = live.status === "loading";
  const shown = page.rows.slice(0, limit);

  // Group the visible rows by calendar day, keeping the newest-first order.
  const days: { heading: string; rows: ActivityEvent[] }[] = [];
  shown.forEach((e) => {
    const h = dayHeading(e.at);
    const g = days[days.length - 1];
    if (g && g.heading === h) g.rows.push(e);
    else days.push({ heading: h, rows: [e] });
  });

  return (
    <div className="ops-calm">
      {heading}
      <section className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-4 min-[768px]:p-5">
        <ListToolbar
          tabsLabel="Activity"
          sort={null}
          search={{ value: searchText, onChange: onSearch, label: "Search activity", placeholder: "Search a person, a record or a reference" }}
          groups={groups}
          onClearFilters={clearAll}
          resultCount={page.total}
        />
        <div className={`transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {page.total === 0 ? (
            <NoResults noun="events" filters={flat} search={query.search} onClear={clearAll} onClearSearch={() => onSearch("")} />
          ) : (
            <div className="flex flex-col gap-5">
              {days.map((d) => (
                <section key={d.heading} aria-label={d.heading}>
                  <h2 className="mb-1 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{d.heading}</h2>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {d.rows.map((e, i) => (
                      <li key={e.id} className={i > 0 ? "border-t border-(--ap-line-2)" : ""}>
                        <button type="button" onClick={() => setOpen(e)} aria-haspopup="dialog" className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left hover:bg-(--ap-tint-soft) active:bg-(--ap-tint-soft)">
                          <AdminAvatar name={e.actorName} size={32} viewable={false} />
                          <span className="min-w-0 flex-1 leading-snug">
                            <span className="block text-[14px] break-words text-(--ap-ink-2)">
                              <b className="font-semibold text-(--ap-ink)">{e.actorName}</b> {VERB[e.action]} <b className="font-semibold text-(--ap-ink)">{e.entityLabel}</b>
                            </span>
                            {e.before || e.after ? (
                              <span className="mt-0.5 block text-[13px] break-words text-(--ap-muted)">{e.before && e.after ? `${e.before} to ${e.after}` : (e.after ?? e.before)}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-[12.5px] text-(--ap-muted) tabular-nums">{clock(e.at)}</span>
                          <ChevronRight className="size-4 shrink-0 text-(--ap-faint) max-[767px]:hidden" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <ShowMore shown={limit} total={page.total} onMore={() => setLimit((n) => n + SHOW_MORE_STEP)} onClear={narrowed ? clearAll : null} />
      </section>
      {open ? <DetailSheet e={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function DetailSheet({ e, onClose }: { e: ActivityEvent; onClose: () => void }) {
  return (
    <SheetFrame
      title={`${e.actorName} ${VERB[e.action]} ${e.entityLabel}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <CancelButton onClick={onClose} label="Close" />
          {e.entityHref ? (
            <Link href={e.entityHref} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
              Open the record
            </Link>
          ) : null}
        </>
      }
    >
      <div className="mt-4">
        <Facts
          items={[
            { label: "Who", value: `${e.actorName}, ${e.actorRole}` },
            { label: "When", value: fullWhen(e.at) },
            { label: "Action", value: ACTION_LABEL[e.action] },
            { label: "Record type", value: TYPE_ONE[e.entityType] },
            ...(e.before ? [{ label: "Before", value: e.before }] : []),
            ...(e.after ? [{ label: "After", value: e.after }] : []),
            ...(e.note ? [{ label: "Note", value: e.note }] : []),
            { label: "Reference", value: <span className="break-all">{e.reference}</span> },
          ]}
        />
        {e.sensitive ? (
          <p className="mt-4 flex items-start gap-2 text-[13px] text-(--ap-muted)">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>This record holds protected personal details. They are never shown in Activity.</span>
          </p>
        ) : null}
      </div>
    </SheetFrame>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-[10px]";
  return (
    <div role="status" aria-busy="true" aria-label="Loading activity" className="ops-calm">
      <PageHeading title="Activity" />
      <div className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-5">
        <div className={`${sk} mb-4 h-11`} />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${sk} h-14`} />
          ))}
        </div>
      </div>
    </div>
  );
}
