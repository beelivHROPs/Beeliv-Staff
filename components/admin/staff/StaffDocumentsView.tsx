"use client";

/**
 * Staff Documents (HR). Documents by staff with status chips; each links to the
 * shared viewer /admin/recruitment/documentation/<id> (built by the Documentation
 * step; link only). Document names and states only: no file bytes, no identity or
 * banking values. Reuses: ClientAvatar, StatusChip (DocStateChip), SearchField,
 * FilterTabs, EmptyState, PageHeading, ClientPageSkeleton/Error.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Files, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ListCard, ListToolbar, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { useStaffDocuments } from "@/lib/admin/staff/hooks";
import { STAFF_DOC_SORTS, type DocState, type StaffDocRow, type StaffDocsPage } from "@/lib/admin/staff/types";
import { AdminState, DOC_STATE, DocStateChip, documentViewerHref, staffHref, useUrlParams } from "./parts";

import { LiveStaffDocumentsView } from "./LiveStaffDocumentsView";
import { orgRecordsMode } from "@/lib/admin/org-records/mode";

const STATES: ("all" | DocState)[] = ["all", "needs-review", "resubmitted", "missing", "uploaded", "verified", "rejected"];

export function StaffDocumentsView() {
  return orgRecordsMode() === "live" ? <LiveStaffDocumentsView /> : <PreviewStaffDocumentsView />;
}

function PreviewStaffDocumentsView() {
  const url = useUrlParams();
  const raw = url.get("status");
  const state = (raw !== "all" && STATES.includes(raw as DocState) ? raw : "") as "" | DocState;
  const q = url.get("q");
  const sort = STAFF_DOC_SORTS.some((o) => o.value === url.get("sort")) ? url.get("sort") : "newest";
  const batch = useBatch([q, state, sort].join("|"));
  const live = useStaffDocuments({ search: q, state, sort, limit: batch.limit });
  const [shown, setShown] = useState<StaffDocsPage | null>(null);
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
  const clear = () => {
    setText("");
    url.set({ q: undefined, status: undefined });
  };

  const rows = page?.rows ?? [];

  return (
    <AdminState status={page ? "ready" : live.status} title="Documents" what="staff documents" retry={live.retry}>
      {!page ? null : (
        <div>
          <PageHeading title="Documents" />
          {page.workspaceEmpty ? (
            <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
              <EmptyState icon={Files} title="No staff documents yet" description="Documents appear here once staff in your clients have records on file." />
            </div>
          ) : (
            <>
              <ListCard title="Staff documents" summary={`${page.total} ${page.total === 1 ? "document" : "documents"}${q || state ? " match your filters" : ""}`}>
              <ListToolbar
                tabsLabel="Filter documents by status"
                tabs={STATES.map((k) => ({ key: k, label: k === "all" ? "All" : DOC_STATE[k].label }))}
                tab={(state || "all") as string}
                onTab={(k) => url.set({ status: k === "all" ? undefined : k })}
                search={{ value: text, onChange: onSearch, label: "Search staff documents", placeholder: "Search staff, reference, document or client" }}
                sort={{ value: sort, options: STAFF_DOC_SORTS, onChange: (v) => url.set({ sort: v === "newest" ? undefined : v }) }}
              />
              <div className={`@container transition-opacity ${live.status === "loading" ? "opacity-60" : ""}`}>
                {rows.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      icon={Search}
                      title="No documents match"
                      description="Try a different name, document or status."
                      action={
                        <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={clear}>
                          <X className="size-4" aria-hidden="true" /> Clear search and filters
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {rows.map((d) => (
                      <DocItem key={d.id} d={d} />
                    ))}
                  </ul>
                )}
              </div>
              <ShowMore shown={rows.length} total={page.total} onMore={batch.more} onClear={q || state ? clear : null} />
              </ListCard>
            </>
          )}
        </div>
      )}
    </AdminState>
  );
}

function DocItem({ d }: { d: StaffDocRow }) {
  return (
    <li className="flex min-h-[68px] flex-col gap-2 border-t border-(--ap-line-2) px-2 py-3 first:border-t-0 hover:bg-(--ap-tint-soft) @min-[760px]:flex-row @min-[760px]:items-center @min-[760px]:gap-5">
      <div className="flex min-w-0 items-center gap-3 @min-[760px]:w-[34%]">
        <AdminAvatar name={d.staffName} size={40} viewable />
        <div className="min-w-0 leading-tight">
          <Link href={staffHref(d.staffId)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
            {d.staffName}
          </Link>
          <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)" title={d.staffReference}>
            {d.staffReference}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <b className="block truncate text-[14px]" title={d.type}>
          {d.type}
        </b>
        <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${d.client}, ${d.outlet}`}>
          {d.client}, {d.outlet}
        </span>
        {d.updatedAt ? <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">Updated {formatDateTime(d.updatedAt)}</span> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <DocStateChip state={d.state} />
        {d.state === "missing" ? null : (
          <Link href={documentViewerHref(d.id)} className="inline-flex h-10 items-center gap-1 text-[14px] font-bold whitespace-nowrap text-(--ap-violet)">
            Open in viewer <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}
