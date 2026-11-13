"use client";

/**
 * Shortlisting (HR, spec 6.4 / 14): screen applicants, filter, select, then
 * Shortlist / Hold / Reject / Move to Talent Pool. The "match" guide assists HR
 * and never decides: every outcome is a human action. Hold and Reject need a
 * screening note. HR cannot approve a selection: this screen only shortlists.
 * Reused: PageHeading, FilterTabs, SelectMenu (via Client FilterSelect),
 * Client SearchField / StatusChip, confirmAction, EmptyState, ErrorPanel,
 * RowMenu, Initials, Disc, AttentionBadge-free. Layout reflows by container width.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { ChevronDown, Search, Users, X } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, HEAD_ROW, TABLE_CARD, TH, useBatch, ListCard, ListToolbar } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { formatDateTime } from "@/lib/admin/sort";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { Initials } from "@/components/admin/overview/Sections";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { AnswersView } from "@/components/admin/applicants/Answers";
import { useApplicant } from "@/lib/admin/applicants/hooks";
import { applicantHref } from "@/lib/admin/links";
import { bulkScreeningAction, useShortlisting } from "@/lib/admin/shortlisting/hooks";
import { SHORTLIST_SORTS, type BulkAction, type DocumentsFilter, type ExperienceFilter, type FitLabel, type ScreeningRow, type ScreeningStatus, type ScreeningTab, type ShortlistingPage, type ShortlistingQuery } from "@/lib/admin/shortlisting/types";
import { ListSkeleton, NoteSheet, NoticeBanner, RestrictedPanel, type Notice } from "@/components/admin/interviews/ui";

const ANY = "__any";
const withAny = (label: string, opts: string[]) => [{ value: ANY, label }, ...opts.map((o) => ({ value: o, label: o }))];

const EXPERIENCE: { value: string; label: string }[] = [
  { value: ANY, label: "Any experience" },
  { value: "0-1", label: "Up to 1 year" },
  { value: "2-3", label: "2 to 3 years" },
  { value: "4-5", label: "4 to 5 years" },
  { value: "6+", label: "6 years or more" },
];
const DOCUMENTS: { value: string; label: string }[] = [
  { value: ANY, label: "Any documents" },
  { value: "complete", label: "Complete" },
  { value: "partial", label: "Partly complete" },
  { value: "none", label: "None uploaded" },
];

const STATUS: Record<ScreeningStatus, { tone: ChipTone; label: string }> = {
  "to-screen": { tone: "info", label: "To screen" },
  shortlisted: { tone: "ok", label: "Shortlisted" },
  hold: { tone: "warn", label: "On hold" },
  rejected: { tone: "mute", label: "Rejected" },
  "talent-pool": { tone: "plum", label: "Talent pool" },
};
const FIT: Record<FitLabel, { tone: ChipTone; label: string }> = {
  strong: { tone: "ok", label: "Strong match" },
  possible: { tone: "info", label: "Possible match" },
  weak: { tone: "mute", label: "Weak match" },
};

type Filters = Omit<ShortlistingQuery, "pageSize">;
const EMPTY_QUERY: Filters = { search: "", tab: "to-screen", vacancyId: "", experience: "", location: "", skill: "", documents: "", sort: "newest", page: 1 };

type Pending = { action: BulkAction; ids: string[] };

const COPY: Record<BulkAction, { verb: string; done: string }> = {
  shortlist: { verb: "Shortlist", done: "shortlisted" },
  hold: { verb: "Put on hold", done: "put on hold" },
  reject: { verb: "Reject", done: "rejected" },
  "talent-pool": { verb: "Move to Talent Pool", done: "moved to the Talent Pool" },
};

export function ShortlistingList() {
  const sp = useSearchParams();
  const [filters, setQuery] = useState<Filters>(() => ({ ...EMPTY_QUERY, sort: SHORTLIST_SORTS.some((o) => o.value === sp.get("sort")) ? (sp.get("sort") as string) : "newest" }));
  const batch = useBatch(JSON.stringify(filters));
  const query: ShortlistingQuery = { ...filters, pageSize: batch.limit };
  const live = useShortlisting(query);
  const [shown, setShown] = useState<ShortlistingPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peek, setPeek] = useState<Set<string>>(new Set());
  const togglePeek = (id: string) =>
    setPeek((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const [sheet, setSheet] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const patch = (p: Partial<Filters>) => {
    setSelected(new Set());
    setQuery((q) => ({ ...q, ...p, page: 1 }));
  };
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ search: v.trim() }), 250);
  };
  const clearAll = () => {
    setSearchText("");
    setSelected(new Set());
    setQuery((q) => ({ ...EMPTY_QUERY, tab: "all", sort: q.sort }));
  };
  const setSort = (v: string) => {
    patch({ sort: v });
    const next = new URLSearchParams(window.location.search);
    if (v === "newest") next.delete("sort");
    else next.set("sort", v);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const anyFilter = !!(query.search || query.vacancyId || query.experience || query.location || query.skill || query.documents);

  const heading = <PageHeading title="Shortlisting" />;

  if (live.status === "restricted") return <RestrictedPanel title="Shortlisting" what="Shortlisting" />;
  if (live.status === "error") {
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load the screening list" retry={live.retry} />
      </>
    );
  }
  if (!page) return <ListSkeleton title="Shortlisting" />;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading}
        <div className={EMPTY_CARD}>
          <EmptyState
            icon={Users}
            title="No applicants to screen"
            description="New applications that reach screening show here, with their match guide and document progress."
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
  const rows = page.rows;
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));

  async function run(p: Pending, note?: string) {
    setBusy(true);
    try {
      const res = await bulkScreeningAction(p.ids, { action: p.action, note });
      const what = COPY[p.action].done;
      setNotice({ kind: "ok", text: `${res.changed} applicant${res.changed === 1 ? " was" : "s were"} ${what}.${res.skipped ? ` ${res.skipped} already ${res.skipped === 1 ? "was" : "were"} in that status.` : ""} Each change is in the applicant's history.` });
      setSelected(new Set());
      setSheet(null);
      live.retry();
    } catch {
      setNotice({ kind: "error", text: "That action could not be completed. Nothing was changed. Please try again." });
      setSheet(null);
    } finally {
      setBusy(false);
    }
  }

  async function start(action: BulkAction, ids: string[]) {
    if (ids.length === 0) return;
    const p: Pending = { action, ids };
    if (action === "hold" || action === "reject") {
      setSheet(p);
      return;
    }
    const n = ids.length;
    const ok = await confirmAction({
      tone: "neutral",
      title: `${COPY[action].verb} ${n} applicant${n === 1 ? "" : "s"}?`,
      description: action === "shortlist" ? "They move to the shortlist. HR shortlists; final selection approval belongs to Operations." : "They stay on record and can be matched to future roles. Their application history is kept.",
      points: ["Each change is written to the applicant's activity history."],
      confirmLabel: COPY[action].verb,
    });
    if (ok) await run(p);
  }

  async function submitNote(p: Pending, note: string) {
    const n = p.ids.length;
    setSheet(null);
    const ok = await confirmAction({
      tone: p.action === "reject" ? "danger" : "neutral",
      title: `${COPY[p.action].verb} ${n} applicant${n === 1 ? "" : "s"}?`,
      description: "Your screening note is saved with each applicant. Their record and history are kept.",
      confirmLabel: COPY[p.action].verb,
    });
    if (ok) await run(p, note);
  }

  const menuFor = (r: ScreeningRow) => (
    <RowMenu
      label={`Actions for ${r.name}`}
      items={[
        { label: "View applicant", href: applicantHref(r.id) },
        { label: "Shortlist", onSelect: () => void start("shortlist", [r.id]) },
        { label: "Hold", onSelect: () => void start("hold", [r.id]) },
        { label: "Reject", tone: "danger", onSelect: () => void start("reject", [r.id]) },
        { label: "Move to Talent Pool", onSelect: () => void start("talent-pool", [r.id]) },
      ]}
    />
  );

  const count = selected.size;
  const ids = [...selected];

  return (
    <div>
      {heading}
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <ListCard flat title="Applicants to screen" summary={`${page.total} ${page.total === 1 ? "applicant" : "applicants"}${anyFilter ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="Filter by screening status"
        tabs={[
          { key: "all", label: "All", count: page.tabCounts.all },
          { key: "to-screen", label: "To screen", count: page.tabCounts["to-screen"] },
          { key: "shortlisted", label: "Shortlisted", count: page.tabCounts.shortlisted },
          { key: "hold", label: "On hold", count: page.tabCounts.hold },
          { key: "rejected", label: "Rejected", count: page.tabCounts.rejected },
          { key: "talent-pool", label: "Talent pool", count: page.tabCounts["talent-pool"] },
        ]}
        tab={query.tab}
        onTab={(k: ScreeningTab) => patch({ tab: k })}
        search={{ value: searchText, onChange: onSearch, label: "Search applicants", placeholder: "Search name, role or skill" }}
        filters={[
          { key: "vacancy", label: "Vacancy", value: query.vacancyId || ANY, onChange: (v) => patch({ vacancyId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All vacancies" }, ...page.facets.vacancies.map((v) => ({ value: v.id, label: v.name }))] },
          { key: "exp", label: "Experience", value: query.experience || ANY, onChange: (v) => patch({ experience: v === ANY ? "" : (v as ExperienceFilter) }), options: EXPERIENCE },
          { key: "loc", label: "Location", value: query.location || ANY, onChange: (v) => patch({ location: v === ANY ? "" : v }), options: withAny("All locations", page.facets.locations) },
          { key: "skill", label: "Skills", value: query.skill || ANY, onChange: (v) => patch({ skill: v === ANY ? "" : v }), options: withAny("All skills", page.facets.skills) },
          { key: "docs", label: "Documents", value: query.documents || ANY, onChange: (v) => patch({ documents: v === ANY ? "" : (v as DocumentsFilter) }), options: DOCUMENTS },
        ]}
        sort={{ value: query.sort, options: SHORTLIST_SORTS, onChange: setSort }}
      />
      {count > 0 ? (
        <div role="region" aria-label="Bulk actions" className="ap-card sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2.5 rounded-2xl p-3">
          <p className="mr-auto px-1 text-[15px] font-bold" aria-live="polite">
            {count} selected
          </p>
          <button type="button" disabled={busy} onClick={() => void start("shortlist", ids)} className="ap-btn ap-btn-p ap-btn-sm h-11 text-white!">
            Shortlist
          </button>
          <button type="button" disabled={busy} onClick={() => void start("hold", ids)} className="ap-btn ap-btn-s ap-btn-sm h-11">
            Hold
          </button>
          <button type="button" disabled={busy} onClick={() => void start("reject", ids)} className="ap-btn ap-btn-s ap-btn-sm h-11">
            Reject
          </button>
          <button type="button" disabled={busy} onClick={() => void start("talent-pool", ids)} className="ap-btn ap-btn-s ap-btn-sm h-11">
            Move to Talent Pool
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ap-hit inline-flex h-11 items-center px-2 text-[14px] font-bold text-(--ap-violet)">
            Clear
          </button>
        </div>
      ) : null}

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Search}
              title={anyFilter ? "No applicants match" : "No applicants in this list"}
              description={anyFilter ? "Nothing matches the search and filters you chose. Try fewer filters." : "Applicants with this screening status show here."}
              action={
                anyFilter || query.tab !== "all" ? (
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <ScreenTable rows={rows} peek={peek} onPeek={togglePeek} selected={selected} allOnPage={allOnPage} onToggle={toggle} onToggleAll={toggleAll} menuFor={menuFor} />
            <ScreenCards hideStatus={["to-screen", "shortlisted", "hold", "rejected"].includes(query.tab)} rows={rows} peek={peek} onPeek={togglePeek} selected={selected} onToggle={toggle} menuFor={menuFor} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={batch.more} onClear={anyFilter ? clearAll : null} />
      </ListCard>

      {sheet ? (
        <NoteSheet
          title={`${COPY[sheet.action].verb} ${sheet.ids.length} applicant${sheet.ids.length === 1 ? "" : "s"}`}
          description={sheet.action === "reject" ? "Records are kept for history. A screening note is required." : "The application is kept, not rejected. A screening note is required."}
          label="Screening note"
          confirmLabel="Continue"
          danger={sheet.action === "reject"}
          onCancel={() => setSheet(null)}
          onSubmit={(note) => void submitNote(sheet, note)}
        />
      ) : null}
    </div>
  );
}

/* ---------- shared bits ---------- */

function Fit({ r }: { r: ScreeningRow }) {
  if (r.fitScore === null || !r.fitLabel) return <span className="text-[14px] text-(--ap-muted)">Not available</span>;
  return (
    <span className="inline-flex items-center gap-2" title="A guide for HR only. It never shortlists or rejects anyone.">
      <StatusChip tone={FIT[r.fitLabel].tone}>{FIT[r.fitLabel].label}</StatusChip>
      <span className="text-[13px] font-semibold text-(--ap-muted) tabular-nums">{r.fitScore}</span>
    </span>
  );
}

function Skills({ skills, max = 3 }: { skills: string[]; max?: number }) {
  const shown = skills.slice(0, max);
  const extra = skills.length - shown.length;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Skills">
      {shown.map((s) => (
        <li key={s} className="inline-flex h-6 items-center rounded-full bg-(--ap-line-2) px-2.5 text-[12px] font-semibold text-(--ap-ink-2)">
          {s}
        </li>
      ))}
      {extra > 0 ? (
        <li title={skills.slice(max).join(", ")} className="inline-flex h-6 items-center rounded-full bg-(--ap-line-2) px-2.5 text-[12px] font-semibold text-(--ap-muted)">
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}

/** Read-only answers summary for one row. Loads the applicant's submitted application on demand. */
function AnswersPeek({ id }: { id: string }) {
  const live = useApplicant(id);
  if (live.status === "loading") return <div className="ap-shimmer h-24 rounded-2xl" role="status" aria-label="Loading answers" />;
  if (!live.data) return <p className="text-[14px] text-(--ap-muted)">Answers are not available for this applicant.</p>;
  return <AnswersView submission={live.data.submission} kinds={["experience", "availability", "screening"]} title="Application answers" compact />;
}

function AnswersToggle({ open, onClick, name }: { open: boolean; onClick: () => void; name: string }) {
  return (
    <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} answers for ${name}`} onClick={onClick} className="ap-hit mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
      Answers <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );
}

const years = (y: number) => (y === 0 ? "No experience" : `${y} year${y === 1 ? "" : "s"}`);
const CHECK = "size-5 shrink-0 cursor-pointer accent-(--ap-violet)";

/* ---------- table (wide containers) ---------- */

const COLS = "grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_40px]";

function ScreenTable({ rows, peek, onPeek, selected, allOnPage, onToggle, onToggleAll, menuFor }: { rows: ScreeningRow[]; selected: Set<string>; allOnPage: boolean; peek: Set<string>; onPeek: (id: string) => void; onToggle: (id: string) => void; onToggleAll: () => void; menuFor: (r: ScreeningRow) => React.ReactNode }) {
  return (
    <div role="table" aria-label="Applicants to screen" className={`${TABLE_CARD} ad-dtable hidden rounded-xl border border-(--ap-line) bg-(--ap-surface) @min-[900px]:block`}>
      <div role="row" className={`grid ${COLS} items-center gap-x-4 ${HEAD_ROW} ${TH}`}>
        <span role="columnheader">
          <input type="checkbox" className={CHECK} checked={allOnPage} onChange={onToggleAll} aria-label="Select all on this page" />
        </span>
        <span role="columnheader">Applicant</span>
        <span role="columnheader">Profile</span>
        <span role="columnheader">Match guide</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="rowgroup">
        <div role="row" aria-selected={selected.has(r.id)} className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[68px] ${selected.has(r.id) ? "bg-(--ap-tint-soft)" : ""}`}>
          <div role="cell">
            <input type="checkbox" className={CHECK} checked={selected.has(r.id)} onChange={() => onToggle(r.id)} aria-label={`Select ${r.name}`} />
          </div>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={r.name} size="size-10" />
            <div className="min-w-0 leading-tight">
              <Link href={applicantHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                {r.name}
              </Link>
              <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)" title={r.vacancy}>
                {r.vacancy}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">
                {r.location}, applied {formatDateTime(r.appliedAt)}
              </span>
            </div>
          </div>
          <div role="cell" className="min-w-0">
            <span className="mb-1 block truncate text-[14px] text-(--ap-ink-2)">
              {years(r.experienceYears)} <span className="text-(--ap-muted)">· Docs <span className="tabular-nums">{r.documentsPercent}%</span></span>
            </span>
            <Skills skills={r.skills} max={1} />
          </div>
          <div role="cell">
            <Fit r={r} />
          </div>
          <div role="cell">
            <StatusChip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusChip>
            <div>
              <AnswersToggle open={peek.has(r.id)} onClick={() => onPeek(r.id)} name={r.name} />
            </div>
          </div>
          <div role="cell">{menuFor(r)}</div>
        </div>
        {peek.has(r.id) ? (
          <div className="border-b border-(--ap-line-2) bg-(--ap-tint-soft) px-4 pt-1 pb-4 last:border-b-0">
            <AnswersPeek id={r.id} />
          </div>
        ) : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- stacked cards (phones, narrow containers) ---------- */

function ScreenCards({ hideStatus = false, rows, peek, onPeek, selected, onToggle, menuFor }: { hideStatus?: boolean; rows: ScreeningRow[]; peek: Set<string>; onPeek: (id: string) => void; selected: Set<string>; onToggle: (id: string) => void; menuFor: (r: ScreeningRow) => React.ReactNode }) {
  return (
    <ul className={`${CARD_LIST} ad-dtable min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:px-4 @min-[900px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={`${CARD_ITEM} ${selected.has(r.id) ? "outline-2 -outline-offset-2 outline-(--ap-violet)" : ""}`}>
          <div className="flex items-center gap-3">
            <label className="ap-hit flex size-10 shrink-0 items-center justify-center">
              <input type="checkbox" className={CHECK} checked={selected.has(r.id)} onChange={() => onToggle(r.id)} aria-label={`Select ${r.name}`} />
            </label>
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={applicantHref(r.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.name}
              </Link>
              <span className="block truncate text-[13px] text-(--ap-muted)" title={`${r.vacancy}, ${r.location}`}>
                {r.vacancy}, {r.location}
              </span>
            </div>
            {menuFor(r)}
          </div>
          {/* One quiet line: status dot + word, then the facts (no pills repeated on every row). */}
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] text-(--ap-muted)">
            {hideStatus ? null : (
              <>
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${r.status === "shortlisted" ? "bg-(--ap-ok)" : r.status === "rejected" ? "bg-(--ap-faint)" : r.status === "hold" ? "bg-(--ap-warn)" : "bg-(--ap-violet)"}`} />
                <span className="shrink-0 font-semibold text-(--ap-ink-2)">{STATUS[r.status].label}</span>
              </>
            )}
            <span className="min-w-0 truncate">
              {hideStatus ? "" : <>&middot; </>}{years(r.experienceYears)} &middot; Docs <span className="tabular-nums">{r.documentsPercent}%</span>{r.fitLabel ? ` · ${FIT[r.fitLabel].label}` : ""}
            </span>
          </p>
          <AnswersToggle open={peek.has(r.id)} onClick={() => onPeek(r.id)} name={r.name} />
          {peek.has(r.id) ? (
            <div className="mt-2">
              <AnswersPeek id={r.id} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
