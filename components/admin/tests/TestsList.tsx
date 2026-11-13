"use client";

/**
 * Tests & Forms list (HR). Same skeleton as Vacancies: PageHeading with the primary action at the right, ONE white card
 * with tabs (All / Tests / Appraisals), search, a Status filter and Sort, a table when the container is wide and stacked
 * rows when narrow, then "Showing n of m" + Show more. Tab, search and filters live in the URL.
 *
 * Reused: PageHeading / EmptyState (applicant primitives), listKit (ListCard, ListToolbar, useBatch, table classes),
 * ShowMore, Client StatusChip (via parts), ErrorPanel, RowMenu, confirmAction, useUrlParams.
 */
import { useCan } from "@/lib/admin/role-access";
import Link from "next/link";
import { useRef, useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FileText, Plus, Search, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { useUrlParams } from "@/components/admin/applicants/url";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, ListCard, ListSkeleton, ListToolbar, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { duplicateForm, setFormStatus, useForms } from "@/lib/admin/tests/hooks";
import type { FormQuery, FormRow, FormSort, FormTab, FormsPage } from "@/lib/admin/tests/adapter";
import type { FormStatus } from "@/lib/forms/types";
import { AUDIENCE_LABEL, FormStatusChip, KindChip, NEW_FORM_HREF, Notice, Restricted, STATUS_LABEL, formHref, resultsHref } from "./parts";

const ANY = "__any";
const TABS: { key: FormTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tests", label: "Tests" },
  { key: "appraisals", label: "Appraisals" },
];
const SORTS: { value: FormSort; label: string }[] = [
  { value: "updated", label: "Last updated" },
  { value: "title", label: "Title (A to Z)" },
];
const STATUSES: FormStatus[] = ["draft", "published", "archived"];

export function TestsList() {
  const canManage = useCan("tests.manage");
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const tab: FormTab = TABS.some((t) => t.key === rawTab) ? (rawTab as FormTab) : "all";
  const sort: FormSort = SORTS.some((s) => s.value === url.get("sort")) ? (url.get("sort") as FormSort) : "updated";
  const rawStatus = url.get("status");
  const status = (STATUSES as string[]).includes(rawStatus) ? (rawStatus as FormStatus) : "";
  const batch = useBatch([url.get("q"), tab, status, sort].join("|"));
  const query: FormQuery = { search: url.get("q"), tab, status, sort, pageSize: batch.limit };

  const live = useForms(query);
  const [shown, setShown] = useState<FormsPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  const [notice, setNotice] = useState<string | null>(null);

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => url.set({ q: v.trim() || undefined }), 250);
  };
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined, tab: undefined, status: undefined });
  };
  const filtersActive = !!(query.search || query.status);
  const anyNarrowing = filtersActive || tab !== "all";

  const newButton = !canManage ? undefined : (
    <Link href={NEW_FORM_HREF} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> New test or form
    </Link>
  );
  const heading = (right?: React.ReactNode) => <PageHeading title="Tests & Forms" right={right} />;

  if (live.status === "error") {
    return (
      <>
        {heading()}
        <ErrorPanel title="We could not load the tests and forms" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading()}
        <Restricted what="Tests and forms" />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Tests & Forms" label="Loading tests and forms" />;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading(newButton)}
        <div className={EMPTY_CARD}>
          <EmptyState icon={FileText} title="No tests or forms yet" description="Create a test to score applicants' knowledge, or an appraisal form to hear from staff. Drafts stay private until you publish them." action={newButton} />
        </div>
      </>
    );
  }

  const archive = async (r: FormRow) => {
    const ok = await confirmAction({
      tone: "caution",
      title: `Archive "${r.title}"?`,
      description: "People will no longer be able to take it. Results already collected stay available, and you can restore it later.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    await setFormStatus(r.id, "archived");
    setNotice(`"${r.title}" was archived.`);
  };
  const duplicate = async (r: FormRow) => {
    const copy = await duplicateForm(r.id);
    setNotice(`A draft copy was created: "${copy.title}".`);
  };

  const menuFor = (r: FormRow) => (
    <RowMenu
      label={`Actions for ${r.title}`}
      items={[
        ...(canManage ? [{ label: "Open and edit", href: formHref(r.id) }] : []),
        { label: "View results", href: resultsHref(r.id) },
        ...(canManage ? [{ label: "Duplicate", onSelect: () => void duplicate(r) }] : []),
        ...(canManage && r.status !== "archived" ? [{ label: "Archive", tone: "danger" as const, onSelect: () => void archive(r) }] : []),
      ]}
    />
  );
  const refreshing = live.status === "loading";

  return (
    <div>
      {heading(newButton)}
      {notice ? <Notice kind="ok" onClose={() => setNotice(null)}>{notice}</Notice> : null}
      <ListCard flat title="Tests & Forms" summary={`${page.total} ${page.total === 1 ? "item" : "items"}${anyNarrowing ? " match your filters" : ""}`}>
        <ListToolbar
          tabsLabel="Filter by type"
          tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: page.tabCounts[t.key] }))}
          tab={tab}
          onTab={(k: FormTab) => url.set({ tab: k === "all" ? undefined : k })}
          search={{ value: searchText, onChange: onSearch, label: "Search tests and forms", placeholder: "Search by title or client" }}
          filters={[
            {
              key: "status",
              label: "Status",
              value: status || ANY,
              onChange: (v) => url.set({ status: v === ANY ? undefined : v }),
              options: [{ value: ANY, label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))],
            },
          ]}
          sort={{ value: sort, options: SORTS, onChange: (v) => url.set({ sort: v === "updated" ? undefined : v }) }}
        />
        <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {page.total === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={Search}
                title={filtersActive ? "Nothing matches these filters" : "Nothing in this tab yet"}
                description={filtersActive ? "Check the spelling, or try another title or client." : "Create one with the New test or form button."}
                action={
                  anyNarrowing ? (
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
        <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filtersActive ? clearAll : null} />
      </ListCard>
    </div>
  );
}

function Who({ r }: { r: FormRow }) {
  const text = `For: ${AUDIENCE_LABEL[r.audience]}${r.clientName ? ` (${r.clientName})` : ""}`;
  return (
    <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={text}>
      {text}
    </span>
  );
}

const COLS = "grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.3fr)_96px_40px]";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Table({ rows, menuFor }: { rows: FormRow[]; menuFor: (r: FormRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Tests and forms" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[720px]:block`}>
      <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW}`}>
        <span role="columnheader" className={TH}>Title</span>
        <span role="columnheader" className={TH}>Type</span>
        <span role="columnheader" className={TH}>Status</span>
        <span role="columnheader" className={`${TH} text-right`}>Submissions</span>
        <span role="columnheader" className="sr-only">Actions</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px]`}>
          <div role="cell" className="min-w-0 leading-tight">
            <Link href={formHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)" title={r.title}>
              {r.title}
            </Link>
            <Who r={r} />
          </div>
          <div role="cell" className="min-w-0">
            <KindChip kind={r.kind} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted) tabular-nums">{plural(r.questionCount, "question", "questions")}</span>
          </div>
          <div role="cell" className="min-w-0">
            <FormStatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)" title={`${formatDateTime(r.updatedAt)} by ${r.updatedBy}`}>
              Updated {formatDateTime(r.updatedAt)}
            </span>
          </div>
          <span role="cell" className="text-right text-[14px] tabular-nums">
            {r.submissionCount > 0 ? (
              <Link href={resultsHref(r.id)} className="font-bold text-(--ap-violet) hover:text-(--ap-plum)">{r.submissionCount}</Link>
            ) : (
              <span className="text-(--ap-muted)">0</span>
            )}
          </span>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows, menuFor }: { rows: FormRow[]; menuFor: (r: FormRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[720px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={formHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.title}
              </Link>
              <Who r={r} />
            </div>
            {menuFor(r)}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <KindChip kind={r.kind} />
            <FormStatusChip status={r.status} />
          </div>
          <p className="mt-1.5 truncate text-[12px] text-(--ap-muted) tabular-nums">
            {plural(r.questionCount, "question", "questions")} · {plural(r.submissionCount, "submission", "submissions")} · Updated {formatDateTime(r.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
