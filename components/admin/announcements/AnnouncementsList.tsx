"use client";

/**
 * Announcements list (HR). Table at container >= 860px, stacked cards below.
 * Search and status filter live in the URL. "Show more" grows the visible count
 * (no pagers). Read and acknowledged counts come from the adapter.
 *
 * Reused: PageHeading / EmptyState (applicant), FilterTabs, SearchField
 * (client records-filters), ErrorPanel (staff), RowMenu (admin overview),
 * ShowMore (admin), StatusChip (via parts), CompletionBar (SOPs & Training).
 */
import { useCan } from "@/lib/admin/role-access";
import Link from "next/link";
import { useRef, useState } from "react";
import { Plus, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Megaphone } from "@/components/staff/icons";
import { useUrlParams } from "@/components/admin/applicants/url";
import { RowMenu, type RowMenuItem } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListCard, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { CompletionBar } from "@/components/admin/sops-training/parts";
import { toast } from "@/components/ui/toast";
import { useAnnouncements } from "@/lib/admin/announcements/hooks";
import type { AnnouncementPage, AnnouncementQuery, AnnouncementRow, AnnouncementStatus } from "@/lib/admin/announcements/types";
import { useAnnouncementActions } from "./actions";
import { announcementEditHref, announcementHref, formatIso, formatYmd, NEW_ANNOUNCEMENT_HREF, STATUS_LABEL, STATUS_ORDER } from "./meta";
import { AnnouncementStatusChip, Restricted } from "./parts";

const isStatus = (v: string): v is AnnouncementStatus => (STATUS_ORDER as string[]).includes(v);

function whenText(r: AnnouncementRow): string {
  const start = r.publishAt ? (r.status === "scheduled" ? `Goes live ${formatIso(r.publishAt)}` : `Published ${formatIso(r.publishAt)}`) : "Not published";
  return r.expiresOn ? `${start} · expires ${formatYmd(r.expiresOn)}` : start;
}

export function AnnouncementsList() {
  const canManage = useCan("announcements.manage");
  const url = useUrlParams();
  const { limit, more } = useBatch(`${url.get("q")}|${url.get("status")}`);
  const query: AnnouncementQuery = { search: url.get("q"), status: isStatus(url.get("status")) ? (url.get("status") as AnnouncementStatus) : "", limit };
  const live = useAnnouncements(query);
  const [shown, setShown] = useState<AnnouncementPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      url.set({ q: v.trim() || undefined });
    }, 250);
  };
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined, status: undefined });
  };
  const narrowing = !!(query.search || query.status);

  const actions = useAnnouncementActions({
    onDone: (_d, message) => toast.add({ title: message, type: "success" }),
    onError: (message) => toast.add({ title: message, type: "error" }),
  });

  const heading = (right?: React.ReactNode) => <PageHeading title="Announcements" right={right} />;

  if (live.status === "error") {
    return (
      <>
        {heading()}
        <ErrorPanel title="We could not load announcements" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading()}
        <Restricted what="Announcements" />
      </>
    );
  }
  if (!page) return <ListSkeleton />;

  const newButton = page.canCreate ? (
    <Link href={NEW_ANNOUNCEMENT_HREF} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> New announcement
    </Link>
  ) : undefined;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading(newButton)}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Megaphone} title="No announcements yet" description="Write a message for all staff, or for a client, outlet or role. Drafts stay private until you publish them." action={newButton} />
        </div>
      </>
    );
  }

  const menuFor = (r: AnnouncementRow) => {
    const items: RowMenuItem[] = [{ label: "View announcement", href: announcementHref(r.id) }];
    if (!canManage) return <RowMenu label={`Actions for ${r.title}`} items={items} />;
    items.push({ label: "Edit", href: announcementEditHref(r.id) });
    if (r.status === "draft") items.push({ label: "Publish", onSelect: () => void actions.start(r, "publish") });
    else {
      if (r.status === "published") items.push({ label: "End now", onSelect: () => void actions.start(r, "end") });
      items.push({ label: r.status === "expired" ? "Reuse as draft" : r.status === "scheduled" ? "Cancel schedule" : "Unpublish", tone: "danger", onSelect: () => void actions.start(r, "unpublish") });
    }
    return <RowMenu label={`Actions for ${r.title}`} items={items} />;
  };

  const refreshing = live.status === "loading";
  return (
    <div>
      {heading(newButton)}

      <ListCard title="Announcements" summary={`${page.total} ${page.total === 1 ? "announcement" : "announcements"}${narrowing ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter announcements by status"
        tabs={[{ key: "all" as const, label: "All", count: page.statusCounts.all }, ...STATUS_ORDER.map((st) => ({ key: st, label: STATUS_LABEL[st], count: page.statusCounts[st] }))]}
        tab={(query.status || "all") as AnnouncementStatus | "all"}
        onTab={(k) => {
          url.set({ status: k === "all" ? undefined : k });
        }}
        search={{ value: searchText, onChange: onSearch, label: "Search announcements", placeholder: "Search title or audience" }}
        sort={null}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={narrowing ? Search : Megaphone}
              title={narrowing ? "No announcements match" : "Nothing here"}
              description={query.search ? "Check the spelling, or try a title or audience." : "No announcements have this status."}
              action={
                narrowing ? (
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table rows={page.rows} menuFor={menuFor} />
            <Cards rows={page.rows} menuFor={menuFor} />
          </>
        )}
      </div>
      <ShowMore shown={page.rows.length} total={page.total} onMore={more} onClear={narrowing ? clearAll : null} />
      </ListCard>
    </div>
  );
}

function Reads({ r }: { r: AnnouncementRow }) {
  if (r.status === "draft" || r.status === "scheduled") return <span className="text-[13px] text-(--ap-muted)">{r.counts.recipients} will receive it</span>;
  return (
    <div className="min-w-0">
      <CompletionBar done={r.counts.read} total={r.counts.recipients} label="Read" />
      <p className="mt-1 truncate text-[12px] leading-snug text-(--ap-muted) tabular-nums">
        {r.counts.read} of {r.counts.recipients} read
        {r.requiresAcknowledgement ? ` · ${r.counts.acknowledged} acknowledged` : ""}
      </p>
    </div>
  );
}

const flags = (r: AnnouncementRow) => [r.pinned ? "Pinned" : null, r.requiresAcknowledgement ? "Acknowledgement requested" : null].filter(Boolean).join(" · ");

function Title({ r }: { r: AnnouncementRow }) {
  return (
    <div className="min-w-0 leading-tight">
      <Link href={announcementHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
        {r.title}
      </Link>
      <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.excerpt}>
        {r.excerpt}
      </span>
      <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={r.audienceLabel}>
        To: {r.audienceLabel}
      </span>
    </div>
  );
}

const COLS = "grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_40px]";

function Table({ rows, menuFor }: { rows: AnnouncementRow[]; menuFor: (r: AnnouncementRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Announcements" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Announcement</span>
        <span role="columnheader" className={TH}>Read</span>
        <span role="columnheader" className={TH}>Status</span>
        <span role="columnheader" className="sr-only">Actions</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0"><Title r={r} /></div>
          <div role="cell" className="min-w-0"><Reads r={r} /></div>
          <div role="cell" className="min-w-0">
            <AnnouncementStatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)" title={flags(r) || undefined}>
              {whenText(r)}
            </span>
            {flags(r) ? <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">{flags(r)}</span> : null}
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, menuFor }: { rows: AnnouncementRow[]; menuFor: (r: AnnouncementRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Link href={announcementHref(r.id)} className="block truncate text-[16px] font-bold text-(--ap-ink)">
                {r.title}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted) tabular-nums">
                {r.status === "draft" || r.status === "scheduled" ? `${r.counts.recipients} will receive it` : `${r.counts.read} of ${r.counts.recipients} read`}
              </span>
            </div>
            {menuFor(r)}
          </div>
          <div className="mt-2.5">
            <AnnouncementStatusChip status={r.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading announcements">
      <PageHeading title="Announcements" />
      <div className={`${sk} mb-3 h-12 max-w-[420px]`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${sk} h-[96px]`} />
        ))}
      </div>
    </div>
  );
}
