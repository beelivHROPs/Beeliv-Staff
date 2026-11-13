"use client";

/**
 * Talent Pool (HR, spec 6.5 / REC-003 / 14): candidates Beeliv has retained
 * for future roles (not selected, withdrawn, or shortlisted but unplaced).
 * Applicants' history is kept; nothing here deletes a person or their record.
 * Layout reflows by the CONTAINER's width: a real table when there is room,
 * stacked cards otherwise (phones, narrow tablets).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Check, Exclaim, Search, UsersRound, X } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ActiveChips, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, ListSkeleton, TABLE_CARD, TH, PhoneScopeSlot, useDeskScope, activeFilterChips, useBatch, type ActiveChip, type FilterDef } from "@/components/admin/listKit";
import { DeskPills, FilterField, FilterSection, FiltersButton, StatusMark } from "@/components/admin/standard";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Disc } from "@/components/admin/overview/Disc";
import { Initials } from "@/components/admin/overview/Sections";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { applicantHref } from "@/lib/admin/links";
import { addCandidateToVacancy, removeCandidateFromPool, useTalentPool } from "@/lib/admin/talent-pool/hooks";
import { POOL_SORTS, type LastContactFilter, type PoolStatus, type PoolTab, type RetainedAs, type TalentPoolPage, type TalentPoolQuery, type TalentPoolRow } from "@/lib/admin/talent-pool/types";
import { ReasonSheet, type ReasonSheetConfig } from "./ReasonSheet";

const ANY = "__any";
const withAny = (label: string, opts: string[]) => [{ value: ANY, label }, ...opts.map((o) => ({ value: o, label: o }))];

const CONTACT_OPTIONS: { value: string; label: string }[] = [
  { value: ANY, label: "Any last contact" },
  { value: "7d", label: "In the last 7 days" },
  { value: "30d", label: "In the last 30 days" },
  { value: "90d", label: "In the last 90 days" },
  { value: "over-90d", label: "More than 90 days ago" },
  { value: "never", label: "Never contacted" },
];

const RETAINED: Record<RetainedAs, string> = { "not-selected": "Not selected", withdrawn: "Withdrew", "shortlisted-unplaced": "Shortlisted, not placed" };

function StatusChip({ status }: { status: PoolStatus }) {
  if (status === "suitable") return <StatusMark tone="ok">Suitable</StatusMark>;
  if (status === "needs-follow-up") return <StatusMark tone="warn">Follow up</StatusMark>;
  return <StatusMark tone="mute">In pool</StatusMark>;
}

type Filters = Omit<TalentPoolQuery, "pageSize">;
const EMPTY_QUERY: Filters = { search: "", tab: "all", skill: "", department: "", location: "", lastContact: "", sort: "newest", page: 1 };

type Notice = { kind: "ok" | "error"; text: string };
type Pending = { row: TalentPoolRow; mode: "add" | "remove" };

export function TalentPoolList() {
  const sp = useSearchParams();
  const deskScope = useDeskScope();
  const [filters, setQuery] = useState<Filters>(() => ({ ...EMPTY_QUERY, sort: POOL_SORTS.some((o) => o.value === sp.get("sort")) ? (sp.get("sort") as string) : "newest" }));
  const batch = useBatch(JSON.stringify(filters));
  const query: TalentPoolQuery = { ...filters, pageSize: batch.limit };
  const live = useTalentPool(query);
  // Keep showing the previous results while a new filter loads (no skeleton flash).
  const [shown, setShown] = useState<TalentPoolPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const patch = (p: Partial<Filters>) => setQuery((q) => ({ ...q, ...p, page: 1 }));
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ search: v.trim() }), 250);
  };
  const clearAll = () => {
    setSearchText("");
    setQuery((q) => ({ ...EMPTY_QUERY, sort: q.sort }));
  };
  const setSort = (v: string) => {
    patch({ sort: v });
    const next = new URLSearchParams(window.location.search);
    if (v === "newest") next.delete("sort");
    else next.set("sort", v);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const filtersActive = !!(query.search || query.skill || query.department || query.location || query.lastContact);
  const anyNarrowing = filtersActive || query.tab !== "all";

  const filterDefs: FilterDef[] = page
    ? [
        { key: "skill", control: "select", label: "Skill", value: query.skill || ANY, onChange: (v) => patch({ skill: v === ANY ? "" : v }), options: withAny("All skills", page.facets.skills) },
        { key: "dept", control: "select", label: "Department", value: query.department || ANY, onChange: (v) => patch({ department: v === ANY ? "" : v }), options: withAny("All departments", page.facets.departments) },
        { key: "loc", control: "select", label: "Location", value: query.location || ANY, onChange: (v) => patch({ location: v === ANY ? "" : v }), options: withAny("All locations", page.facets.locations) },
        { key: "contact", control: "select", label: "Last contact", value: query.lastContact || ANY, onChange: (v) => patch({ lastContact: v === ANY ? "" : (v as LastContactFilter) }), options: CONTACT_OPTIONS },
      ]
    : [];
  const TAB_LABELS: { key: PoolTab; label: string; short: string }[] = [
    { key: "all", label: "All", short: "people" },
    { key: "suitable", label: "Suitable for new roles", short: "suitable for new roles" },
    { key: "follow-up", label: "Needs follow-up", short: "need follow-up" },
  ];
  const statusDef: FilterDef | null = page ? { key: "tab", label: "Show", control: "chips", value: query.tab, onChange: (v) => patch({ tab: v as PoolTab }), options: TAB_LABELS.map((t) => ({ value: t.key, label: `${t.label} ${page.tabCounts[t.key]}` })) } : null;
  const sortDef: FilterDef = { key: "sort", label: "Sort", value: query.sort, onChange: setSort, options: POOL_SORTS, control: "select" };
  const clearFilters = () => patch({ tab: "all", skill: "", department: "", location: "", lastContact: "" });
  const appliedChips: ActiveChip[] = [...(query.tab !== "all" ? [{ key: "__tab", label: "Show", text: TAB_LABELS.find((t) => t.key === query.tab)?.label ?? query.tab, onRemove: () => patch({ tab: "all" }) }] : []), ...activeFilterChips(filterDefs)];

  const heading = <PageHeading title="Talent Pool" />;

  if (live.status === "error" || live.status === "restricted") {
    return (
      <>
        {heading}
        <ErrorPanel title={live.status === "restricted" ? "The talent pool is not available for this account" : "We could not load the talent pool"} retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Talent Pool" label="Loading the talent pool" />;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <div className={EMPTY_CARD}>
          <EmptyState
            icon={UsersRound}
            title="The talent pool is empty"
            description="Candidates you keep for future roles show here, with their skills and when you last spoke."
            action={
              <Link href="/admin/recruitment/applicants" className="ap-btn ap-btn-s ap-btn-sm">
                Browse applicants
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const refreshing = live.status === "loading";

  async function submitReason(p: Pending, reason: string, vacancyId: string) {
    setPending(null);
    const row = p.row;
    if (p.mode === "remove") {
      await confirmAction({
        tone: "danger",
        title: `Remove ${row.name} from the talent pool?`,
        description: "They will no longer appear in this list.",
        points: ["Their applicant record, applications and history are kept.", "The reason you gave is added to their activity history."],
        confirmLabel: "Remove from pool",
        onConfirm: async () => {
          try {
            await removeCandidateFromPool(row.id, { reason });
            setNotice({ kind: "ok", text: `${row.name} was removed from the talent pool. Their history is kept.` });
            live.retry();
          } catch {
            setNotice({ kind: "error", text: `We could not remove ${row.name}. Nothing was changed. Please try again.` });
          }
        },
      });
      return;
    }
    const vac = page?.openVacancies.find((v) => v.id === vacancyId);
    await confirmAction({
      tone: "neutral",
      title: `Add ${row.name} to ${vac?.title ?? "this vacancy"}?`,
      description: "Beeliv HR will see this in the applicant's activity history.",
      points: vac ? [`${vac.title}, ${vac.outlet}`, "The reason you gave is added to their activity history."] : undefined,
      confirmLabel: "Add to vacancy",
      onConfirm: async () => {
        try {
          await addCandidateToVacancy(row.id, { vacancyId, reason });
          setNotice({ kind: "ok", text: `${row.name} was added to ${vac?.title ?? "the vacancy"}.` });
          live.retry();
        } catch {
          setNotice({ kind: "error", text: `We could not add ${row.name} to the vacancy. Nothing was changed. Please try again.` });
        }
      },
    });
  }

  const sheet: ReasonSheetConfig | null = pending
    ? pending.mode === "remove"
      ? { title: `Remove ${pending.row.name}`, description: "Tell us why this person is leaving the pool. Their record and history stay in Beeliv.", confirmLabel: "Continue", tone: "danger" }
      : { title: `Add ${pending.row.name} to a vacancy`, description: "Choose the vacancy and say why this person is a fit.", confirmLabel: "Continue", tone: "neutral", vacancies: page.openVacancies.map((v) => ({ value: v.id, label: `${v.title} - ${v.outlet}` })) }
    : null;

  const menuFor = (r: TalentPoolRow) => (
    <RowMenu
      label={`Actions for ${r.name}`}
      items={[
        { label: "View applicant", href: applicantHref(r.applicantId) },
        { label: "Match to vacancy", onSelect: () => setPending({ row: r, mode: "add" }) },
        { label: "Remove from pool", tone: "danger", onSelect: () => setPending({ row: r, mode: "remove" }) },
      ]}
    />
  );

  return (
    <div>
      {heading}

      {notice ? (
        <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
          <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section aria-label="Talent Pool" data-search-scope className="ap-card min-w-0 rounded-[20px] p-4.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none">
      <div className="contents max-[767px]:mb-4 max-[767px]:block">
      <SearchBar
        search={{ value: searchText, onChange: onSearch, label: "Search the talent pool", placeholder: "Search name, role, skill or location" }}
        settleKey={appliedChips.map((c) => c.text).join("|")}
        filterSlot={
        <FiltersButton active={appliedChips.length} resultCount={page.total} onClear={clearFilters}>
          {({ sheet }) => (
            <>
              {statusDef ? (
                <FilterSection title="Show">
                  <FilterField f={statusDef} sheet={sheet} />
                </FilterSection>
              ) : null}
              {filterDefs.map((f) => (
                <FilterSection key={f.key} title={f.label} inline>
                  <FilterField f={f} sheet={sheet} />
                </FilterSection>
              ))}
              <FilterSection title="Sort" inline>
                <FilterField f={sortDef} sheet={sheet} />
              </FilterSection>
            </>
          )}
        </FiltersButton>
        }
      />
      <PhoneScopeSlot />
      {deskScope ?? <DeskPills label="Talent pool" pills={TAB_LABELS.map((t) => ({ key: t.key, label: t.label, count: page.tabCounts[t.key], active: query.tab === t.key, onClick: () => patch({ tab: t.key }) }))} />}
      <ActiveChips chips={appliedChips} onClearAll={clearFilters} className="mb-6 max-[767px]:mb-0" />
      </div>
      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title="No candidates match"
              description={query.search ? "Check the spelling, or try a name, role or skill." : "No one in the pool matches the current tab and filters."}
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
            <PoolTable rows={page.rows} menuFor={menuFor} />
            <PoolCards rows={page.rows} menuFor={menuFor} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={filtersActive ? clearAll : null} />
      </section>

      {pending && sheet ? <ReasonSheet key={`${pending.mode}-${pending.row.id}`} config={sheet} onCancel={() => setPending(null)} onSubmit={(reason, vacancyId) => void submitReason(pending, reason, vacancyId)} /> : null}
    </div>
  );
}

/* ---------- shared bits ---------- */

function Skills({ skills, max = 3 }: { skills: string[]; max?: number }) {
  const shown = skills.slice(0, max);
  const extra = skills.length - shown.length;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Skills">
      {shown.map((s) => (
        <li key={s}>
          <span className="inline-flex h-6 items-center rounded-full bg-(--ap-line-2) px-2.5 text-[12px] font-semibold text-(--ap-ink-2)">{s}</span>
        </li>
      ))}
      {extra > 0 ? (
        <li title={skills.slice(max).join(", ")}>
          <span className="inline-flex h-6 items-center rounded-full bg-(--ap-line-2) px-2.5 text-[12px] font-semibold text-(--ap-muted)">+{extra}</span>
        </li>
      ) : null}
    </ul>
  );
}

/* ---------- table (wide containers) ---------- */

const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_40px]";

function PoolTable({ rows, menuFor }: { rows: TalentPoolRow[]; menuFor: (r: TalentPoolRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Talent pool" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[900px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 rounded-t-xl border-b border-(--ap-line-2) bg-(--ap-surface) px-4 py-3 ${TH}`}>
        <span role="columnheader">Candidate</span>
        <span role="columnheader">Source vacancy</span>
        <span role="columnheader">Skills</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-14 px-4 py-2.5 first:border-t-0`}>
          <div role="cell" className="flex min-w-0 items-center gap-3">
            <Initials name={r.name} size="size-9" />
            <div className="min-w-0 leading-tight">
              <Link href={applicantHref(r.applicantId)} className="block text-[15px] font-bold [overflow-wrap:anywhere] text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
              <span className="mt-0.5 block text-[13px] [overflow-wrap:anywhere] text-(--ap-muted)">
                {r.appliedFor.join(", ")} · {r.location}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block text-[14px] [overflow-wrap:anywhere] text-(--ap-ink-2)">{r.sourceVacancy.title}</span>
            <span className="mt-0.5 block text-[12px] [overflow-wrap:anywhere] text-(--ap-muted)">
              {RETAINED[r.retainedAs]}
              {r.reasonNote ? ` · ${r.reasonNote}` : ""}
            </span>
          </div>
          <div role="cell" className="min-w-0">
            <Skills skills={r.skills} max={2} />
          </div>
          <div role="cell" className="min-w-0">
            <StatusChip status={r.status} />
            <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">Last contact: {r.lastContactAt ? formatDateTime(r.lastContactAt) : "never"}</span>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- stacked cards (phones, narrow containers) ---------- */

function PoolCards({ rows, menuFor }: { rows: TalentPoolRow[]; menuFor: (r: TalentPoolRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[900px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-3">
            <Initials name={r.name} size="size-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={applicantHref(r.applicantId)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.name}
              </Link>
              <span className="block truncate text-[13px] text-(--ap-muted)" title={r.appliedFor.join(", ")}>
                {r.appliedFor.join(", ")} · {r.location}
              </span>
            </div>
            {menuFor(r)}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusChip status={r.status} />
            <span className="min-w-0 truncate text-[12px] text-(--ap-muted)">
              {r.sourceVacancy.title} ({RETAINED[r.retainedAs]}) · {r.lastContactAt ? formatDateTime(r.lastContactAt) : "Never contacted"}
            </span>
          </div>
          <div className="mt-2">
            <Skills skills={r.skills} max={3} />
          </div>
        </li>
      ))}
    </ul>
  );
}
