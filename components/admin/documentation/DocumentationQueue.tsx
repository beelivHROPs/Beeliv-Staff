"use client";

/**
 * Central Documentation queue (HR, spec 30.3). Tabs: Needs Review / Missing /
 * Resubmission Required / Verified. Rows open the exact protected record
 * (/admin/recruitment/documentation/[id]). Layout reflows by the CONTAINER's
 * width: a real table when there is room, stacked cards otherwise.
 * Document status is separate from the person's, application's and
 * assignment's status; only the document status is shown here.
 * Bulk selection is deliberately not built (optional in the brief).
 * Reused: FilterTabs, EmptyState/PageHeading (applicant primitives),
 * SearchField + FilterSelect (components/client/records-filters), StatusChip
 * (components/client), ErrorPanel (staff), Initials (admin overview).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, FileText } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Initials } from "@/components/admin/overview/Sections";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListSkeleton, TABLE_CARD, TH, useBatch, ListCard, ListToolbar, NoResults, type FilterDef } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { useDocumentQueue } from "@/lib/admin/documentation/hooks";
import { documentHref } from "@/lib/admin/documentation/links";
import { DOCUMENT_SORTS, type DocumentQuery, type DocumentQueuePage, type DocumentRow, type DocumentTab } from "@/lib/admin/documentation/types";
import { DocStatusChip } from "./parts";

const ANY = "__any";
const withAny = (label: string, opts: string[]) => [{ value: ANY, label }, ...opts.map((o) => ({ value: o, label: o }))];

/** Overview links use ?status=needs-review|missing|resubmitted|verified|pending. */
function tabFromParam(p: string | null): DocumentTab {
  if (p === "missing" || p === "verified") return p;
  if (p === "resubmitted" || p === "resubmission" || p === "resubmission-required") return "resubmission";
  return "needs-review";
}

const EMPTY_BY_TAB: Record<DocumentTab, { title: string; description: string }> = {
  "needs-review": { title: "Nothing waiting for review", description: "Documents people upload show here until HR verifies them." },
  missing: { title: "No missing documents", description: "Required documents that have not been uploaded yet show here." },
  resubmission: { title: "No resubmissions pending", description: "Documents sent back for a new upload, and new versions that came back, show here." },
  verified: { title: "No verified documents yet", description: "Documents HR has verified show here." },
};

export function DocumentationQueue() {
  const params = useSearchParams();
  const [filters, setQuery] = useState<Omit<DocumentQuery, "pageSize">>({
    search: "",
    tab: tabFromParam(params.get("status")),
    docType: "",
    vacancy: "",
    reviewer: "",
    sort: DOCUMENT_SORTS.some((o) => o.value === params.get("sort")) ? (params.get("sort") as string) : "newest",
    page: 1,
  });
  const batch = useBatch(JSON.stringify(filters));
  const query: DocumentQuery = { ...filters, pageSize: batch.limit };
  const live = useDocumentQueue(query);
  // Keep showing the previous results while a new filter loads (no skeleton flash).
  const [shown, setShown] = useState<DocumentQueuePage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patch = (p: Partial<DocumentQuery>) => setQuery((q) => ({ ...q, ...p, page: 1 }));
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ search: v.trim() }), 250);
  };
  const setSort = (v: string) => {
    patch({ sort: v });
    const next = new URLSearchParams(window.location.search);
    if (v === "newest") next.delete("sort");
    else next.set("sort", v);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const clearAll = () => {
    setSearchText("");
    setQuery((q) => ({ ...q, search: "", docType: "", vacancy: "", reviewer: "", page: 1 }));
  };
  const filtered = !!(query.search || query.docType || query.vacancy || query.reviewer);
  const filteredOrNull = filtered ? clearAll : null;

  const heading = (
    <>
      <PageHeading title="Documentation" />
      <ScopeNote />
    </>
  );

  if (live.status === "error" || live.status === "restricted") {
    return (
      <>
        {heading}
        <ErrorPanel title={live.status === "restricted" ? "The documentation queue is not available for this account" : "We could not load the documentation queue"} retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Documentation" label="Loading documents" />;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <ScopeGate>
          <div className={EMPTY_CARD}>
            <EmptyState icon={FileText} title="No documents to manage yet" description="Documents applicants and staff upload show here for review, with their status and history." />
          </div>
        </ScopeGate>
      </>
    );
  }

  const refreshing = live.status === "loading";
  const reviewerOptions = [{ value: ANY, label: "Any reviewer" }, { value: "__none", label: "Unassigned" }, ...page.facets.reviewers.map((r) => ({ value: r, label: r }))];
  const filterDefs: FilterDef[] = [
    { key: "type", label: "Document type", value: query.docType || ANY, onChange: (v) => patch({ docType: v === ANY ? "" : v }), options: withAny("All document types", page.facets.docTypes) },
    { key: "vacancy", label: "Vacancy or staff", value: query.vacancy || ANY, onChange: (v) => patch({ vacancy: v === ANY ? "" : v }), options: withAny("All vacancies and staff", page.facets.vacancies) },
    { key: "reviewer", label: "Reviewer", value: query.reviewer || ANY, onChange: (v) => patch({ reviewer: v === ANY ? "" : v }), options: reviewerOptions },
  ];

  return (
    <div>
      {heading}

      <ListCard flat title="Documents" summary={`${page.total} ${page.total === 1 ? "document" : "documents"}${filtered ? " match your filters" : " in this tab"}`}>
      <ListToolbar
        tabsLabel="Filter documents by status"
        tabs={[
          { key: "needs-review", label: "Needs review", count: page.tabCounts["needs-review"] },
          { key: "missing", label: "Missing", count: page.tabCounts.missing },
          { key: "resubmission", label: "Resubmission required", count: page.tabCounts.resubmission },
          { key: "verified", label: "Verified", count: page.tabCounts.verified },
        ]}
        tab={query.tab}
        onTab={(k: DocumentTab) => patch({ tab: k })}
        search={{ value: searchText, onChange: onSearch, label: "Search documents", placeholder: "Search person, reference or document" }}
        groups={[
          { key: "type", title: "Document type", filters: [filterDefs[0]] },
          { key: "context", title: "Vacancy or staff", filters: [filterDefs[1]] },
          { key: "reviewer", title: "Reviewer", filters: [filterDefs[2]] },
        ]}
        onClearFilters={() => patch({ docType: "", vacancy: "", reviewer: "" })}
        resultCount={page.total}
        sort={{ value: query.sort, options: DOCUMENT_SORTS, onChange: setSort }}
      />
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            {filtered ? (
              <NoResults
                noun="documents"
                filters={filterDefs}
                search={query.search}
                onClearSearch={() => {
                  setSearchText("");
                  patch({ search: "" });
                }}
                onClear={clearAll}
              />
            ) : (
              <EmptyState icon={FileText} {...EMPTY_BY_TAB[query.tab]} />
            )}
          </div>
        ) : (
          <>
            <QueueTable rows={page.rows} />
            <QueueCards rows={page.rows} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filteredOrNull} />
      </ListCard>
    </div>
  );
}

/* ---------- table (wide containers) ---------- */

const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_24px]";

function QueueTable({ rows }: { rows: DocumentRow[] }) {
  return (
    <div role="table" aria-label="Documents" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[720px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">Person</span>
        <span role="columnheader">Document</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Required action</span>
        <span role="columnheader" className="sr-only">
          Open
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={r.owner.name} size="size-10" />
            <div className="min-w-0 leading-tight">
              <Link href={documentHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.owner.name}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.context}>
                {r.context}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] font-semibold text-(--ap-ink-2)" title={r.docType}>
              {r.docType}
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{r.stage === "application" ? "Application" : "Pre-employment"}</span>
            <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">{r.uploadedAt ? `Uploaded ${formatDateTime(r.uploadedAt)}` : "Not uploaded"}</span>
          </div>
          <div role="cell" className="min-w-0">
            <DocStatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">{r.reviewer ?? "Unassigned"}</span>
          </div>
          <span role="cell" className="min-w-0 truncate text-[13px] text-(--ap-ink-2)" title={r.requiredAction}>
            {r.requiredAction}
          </span>
          <span role="cell" className="text-(--ap-faint)">
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- stacked cards (phones, narrow containers) ---------- */

function QueueCards({ rows }: { rows: DocumentRow[] }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[720px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <Initials name={r.owner.name} size="size-9" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={documentHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.owner.name}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={`${r.docType}, ${r.context}`}>
                {r.docType} · {r.uploadedAt ? formatDateTime(r.uploadedAt) : "Not uploaded"}
              </span>
              <span className="mt-1 block"><DocStatusChip status={r.status} /></span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
