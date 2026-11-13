"use client";

/**
 * Attendance (HR, scoped to assigned clients / outlets). Today board as metric
 * tiles (Client style), then the records table with date range, client,
 * outlet and status tabs. Rows open the record (/admin/workforce/attendance/[id]).
 * Late / absent / grace rules are NOT decided here: the status comes from the
 * adapter (rules need Beeliv confirmation). Reflows by container width.
 * Reused: FilterTabs, EmptyState/PageHeading, SearchField + FilterSelect,
 * DateRangeSelector (client charts), AttendanceChip + StatusChip (client),
 * ErrorPanel (staff), Disc, ShowMore, AdminAvatar.
 */
import Link from "next/link";
import { useState } from "react";
import { ShowMore, SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import { ActiveChips, CARD_ITEM, CARD_LIST, TABLE_CARD, type ActiveChip, type FilterDef } from "@/components/admin/listKit";
import { AdminPageHeader, FilterField, FilterSection, FiltersButton, InfoHint, StatusMark } from "@/components/admin/standard";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useIsPhone } from "@/components/applicant/motion";
import { Check, CircleAlert, Clock3, Search, Sun, X } from "@/components/applicant/icons";
import type { ChipTone } from "@/components/client/StatusChip";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ADMIN_ROLE_CLASS } from "@/components/admin/nav";
import { DateRangeSelector, resolveRange, type RangeValue } from "@/components/client/charts";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { dayMonth, fullDay } from "@/lib/client/format";
import { useAttendance } from "@/lib/admin/workforce/hooks";
import type { AttendancePage, AttendanceQuery, AttendanceRow, AttendanceStatus, AttendanceTab } from "@/lib/admin/workforce/types";
import { ATTENDANCE_LABEL, FlagChips, StaffCell, TH, attendanceHref, clockOf, dayLabelOf, range as clockRange, scopeFilterDefs, staffHref, useSearchCommit } from "./parts";
import { EmptyCard, FailurePanel, ListSkeleton } from "./states";
import { PhoneAttendanceTop } from "./PhoneAttendanceTop";

const ANY_VALUE = "__any";
/** Phones list 5 records at a time, wider screens 10. */
const stepNow = () => (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? 5 : SHOW_MORE_STEP);
const ATTENDANCE_TAB_LABEL: Record<AttendanceTab, string> = { all: "All", present: "Present", late: "Late", absent: "Absent", "on-leave": "On leave", corrections: "Corrections" };

const PRESETS = [
  { key: "today" as const, label: "Today" },
  { key: "7d" as const, label: "Week" },
  { key: "30d" as const, label: "Month" },
];

const EMPTY_BY_TAB: Record<AttendanceTab, { title: string; description: string }> = {
  all: { title: "No attendance records in this period", description: "Records appear once scheduled staff check in. Try a wider date range." },
  present: { title: "No one is recorded as present", description: "Staff who checked in on time show here." },
  late: { title: "No late check-ins", description: "Check-ins the system recorded as late show here." },
  absent: { title: "No absences", description: "Scheduled staff with no check-in and no leave show here." },
  "on-leave": { title: "No one on leave", description: "Staff on approved leave during the period show here." },
  corrections: { title: "No corrections waiting", description: "Records with a correction request show here." },
};

const ATTENDANCE_TONE: Record<AttendanceStatus, ChipTone> = { present: "ok", late: "warn", absent: "bad", "on-leave": "info", "not-yet": "mute" };
const AttendanceMark = ({ status }: { status: AttendanceStatus }) => <StatusMark tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_LABEL[status]}</StatusMark>;

/** Desktop / tablet status pill: mint, sand, rose, grey, lavender (same hues as the phone pills; dark mode has its own). */
const PILL: Record<AttendanceStatus, string> = {
  present: "bg-[#e3f6ea] text-[#17803d] [html[data-admin-theme=dark]_&]:bg-[#12302a] [html[data-admin-theme=dark]_&]:text-[#7fdcb6]",
  late: "bg-[#fdf0d8] text-[#9a5a06] [html[data-admin-theme=dark]_&]:bg-[#33261a] [html[data-admin-theme=dark]_&]:text-[#f0c27a]",
  absent: "bg-[#fde8ea] text-[#b4232c] [html[data-admin-theme=dark]_&]:bg-[#36172a] [html[data-admin-theme=dark]_&]:text-[#f4a9c6]",
  "on-leave": "bg-[#efe8f6] text-[#5b3f86] [html[data-admin-theme=dark]_&]:bg-[#2c2140] [html[data-admin-theme=dark]_&]:text-[#cbb8ee]",
  "not-yet": "bg-[#f0edf2] text-[#6b6270] [html[data-admin-theme=dark]_&]:bg-[#2a1d27] [html[data-admin-theme=dark]_&]:text-[#cdbfd0]",
};
const StatusPill = ({ status }: { status: AttendanceStatus }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-bold whitespace-nowrap ${PILL[status]}`}>{ATTENDANCE_LABEL[status]}</span>
);

/** Solid icon tiles for the five summary cards. */
const TILE = { in: "bg-[#2f9e5b]", notyet: "bg-[#8a8190]", late: "bg-[#c98a1b]", absent: "bg-[#d6455a]", leave: "bg-[#7a5cb0]" };
function SummaryCard({ icon: Icon, tile, value, label, active, onClick }: { icon: typeof Check; tile: string; value: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${value} ${label}, show in the list`}
      className={`ap-card ap-hit flex min-w-0 flex-col items-start gap-2.5 rounded-xl p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none @min-[760px]:flex-row @min-[760px]:items-center @min-[760px]:gap-3 ${active ? "ring-2 ring-(--ap-violet)" : ""}`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] text-white ${tile}`} aria-hidden="true">
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 leading-tight">
        <b className="block text-[26px] leading-none font-bold text-(--ap-ink) tabular-nums">{value}</b>
        <span className="mt-1 block text-[13px] text-(--ap-muted)">{label}</span>
      </span>
    </button>
  );
}

function InCard(p:Parameters<typeof EmptyCard>[0]) {
  return (
    <div className="py-6">
      <EmptyState icon={p.icon} title={p.title} description={p.description} action={p.action} />
    </div>
  );
}

export function AttendanceList() {
  const [rangeValue, setRangeValue] = useState<RangeValue>(() => resolveRange("7d"));
  const [query, setQuery] = useState<AttendanceQuery>(() => {
    const r = resolveRange("7d");
    return { search: "", tab: "all", from: r.from, to: r.to, clientId: "", outletId: "", pageSize: stepNow() };
  });
  const phone = useIsPhone();
  const live = useAttendance(query);
  // Keep showing the previous results while a new filter loads (no skeleton flash).
  const [shown, setShown] = useState<AttendancePage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const patch = (p: Partial<AttendanceQuery>) => setQuery((q) => ({ ...q, ...p, pageSize: stepNow() }));
  const search = useSearchCommit((v) => patch({ search: v }));
  const setRange = (v: RangeValue) => {
    setRangeValue(v);
    patch({ from: v.from, to: v.to });
  };
  const filtered = !!(query.search || query.clientId || query.outletId);
  const clearAll = () => {
    search.clear();
    setQuery((q) => ({ ...q, search: "", clientId: "", outletId: "", pageSize: stepNow() }));
  };

  if (live.status === "error" || live.status === "restricted") return <FailurePanel status={live.status} title="Attendance" what="Attendance" retry={live.retry} />;
  if (!page) return <ListSkeleton title="Attendance" />;
  if (page.workspaceEmpty) {
    return (
      <>
        <PageHeading title="Attendance" />
        <EmptyCard icon={Clock3} title="No attendance to show yet" description="Once staff are scheduled at your clients and outlets and check in, today's board and the records show here." />
      </>
    );
  }

  const refreshing = live.status === "loading";
  const t = page.today;
  const todayOnly = (tab: AttendanceTab) => {
    const r = resolveRange("today");
    setRangeValue(r);
    setQuery((q) => ({ ...q, tab, from: r.from, to: r.to, pageSize: stepNow() }));
  };
  const DEFAULT_PRESET = "7d";
  const rangeText = rangeValue.preset === "custom" ? `${dayMonth(rangeValue.from)} - ${dayMonth(rangeValue.to)}` : (PRESETS.find((p) => p.key === rangeValue.preset)?.label ?? "");
  const tabCounts = page.tabCounts;
  const statusDef: FilterDef = {
    key: "status",
    label: "Status",
    value: query.tab,
    onChange: (v) => patch({ tab: v as AttendanceTab }),
    control: "chips",
    options: [
      { value: "all", label: `All ${tabCounts.all}` },
      { value: "present", label: `Present ${tabCounts.present}` },
      { value: "late", label: `Late ${tabCounts.late}` },
      { value: "absent", label: `Absent ${tabCounts.absent}` },
      { value: "on-leave", label: `On leave ${tabCounts["on-leave"]}` },
      { value: "corrections", label: `Corrections ${tabCounts.corrections}` },
    ],
  };
  const scopeDefs = scopeFilterDefs(page.facets, query.clientId, query.outletId, (p) => patch(p)).map((f) => ({ ...f, control: "select" as const }));
  const clearFilters = () => {
    const r = resolveRange(DEFAULT_PRESET);
    setRangeValue(r);
    setQuery((q) => ({ ...q, tab: "all", clientId: "", outletId: "", from: r.from, to: r.to, pageSize: stepNow() }));
  };
  const appliedChips: ActiveChip[] = [
    ...(query.tab !== "all" ? [{ key: "tab", label: "Status", text: ATTENDANCE_TAB_LABEL[query.tab], onRemove: () => patch({ tab: "all" }) }] : []),
    ...(rangeValue.preset !== DEFAULT_PRESET ? [{ key: "range", label: "Period", text: rangeText, onRemove: () => setRange(resolveRange(DEFAULT_PRESET)) }] : []),
    ...scopeDefs.filter((f) => f.value !== ANY_VALUE).map((f) => ({ key: f.key, label: f.label, text: f.options.find((o) => o.value === f.value)?.label ?? f.value, onRemove: () => f.onChange(ANY_VALUE) })),
  ];

  const scopeChips = appliedChips.filter((c) => c.key !== "tab" && c.key !== "range");
  const summary: { key: string; icon: typeof Check; tile: string; value: number; label: string; tab: AttendanceTab }[] = [
    { key: "in", icon: Check, tile: TILE.in, value: t.checkedIn, label: "Checked in", tab: "present" },
    { key: "notyet", icon: Clock3, tile: TILE.notyet, value: t.notYet, label: "Not yet in", tab: "all" },
    { key: "late", icon: CircleAlert, tile: TILE.late, value: t.late, label: "Late", tab: "late" },
    { key: "absent", icon: X, tile: TILE.absent, value: t.absent, label: "Absent", tab: "absent" },
    { key: "leave", icon: Sun, tile: TILE.leave, value: t.onLeave, label: "On leave", tab: "on-leave" },
  ];
  const isToday = rangeValue.preset === "today";

  return (
    <div>
      <AdminPageHeader title="Attendance" />

      {/* Tablet and desktop: five clickable summary cards for today (phones keep their own top block below). */}
      <div className="@container mb-6 max-[767px]:hidden">
        <div className="mb-3 flex items-center gap-1.5 text-[13px] text-(--ap-muted)">
          <span className="font-semibold text-(--ap-ink-2)">Today, {fullDay(t.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{t.scheduled} scheduled</span>
          <InfoHint label="About late and absent">When someone counts as late or absent, and any grace period, is decided by the system and needs Beeliv confirmation.</InfoHint>
        </div>
        <div role="group" aria-label="Today's attendance" className="grid grid-cols-5 gap-3">
          {summary.map((s) => (
            <SummaryCard key={s.key} icon={s.icon} tile={s.tile} value={s.value} label={s.label} active={isToday && s.key !== "notyet" && query.tab === s.tab} onClick={() => todayOnly(s.tab)} />
          ))}
        </div>
      </div>

      <section aria-label="Attendance records" data-search-scope className="ap-card min-w-0 rounded-xl p-4.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:shadow-none min-[768px]:p-4">
      <div className="contents max-[767px]:mb-4 max-[767px]:block">
      <SearchBar
        className="mb-4 max-[767px]:mb-0"
        search={{ value: search.text, onChange: search.onChange, label: "Search attendance", placeholder: "Search staff, outlet or role" }}
        settleKey={appliedChips.map((c) => c.text).join("|")}
        filterSlot={
        <FiltersButton active={phone ? appliedChips.length : scopeChips.length} resultCount={page.total} onClear={clearFilters}>
          {({ sheet }) => (
            <>
              {sheet ? (
                <>
                  <FilterSection title="Status">
                    <FilterField f={statusDef} sheet={sheet} />
                  </FilterSection>
                  <FilterSection title="Period">
                    <DateRangeSelector value={rangeValue} onChange={setRange} presets={PRESETS} customShowsDates={false} themeClass={`admin-theme ${ADMIN_ROLE_CLASS}`} ariaLabel="Attendance period" className="w-full [&>*]:flex-1" />
                  </FilterSection>
                </>
              ) : null}
              {scopeDefs.map((f) => (
                <FilterSection key={f.key} title={f.label} inline>
                  <FilterField f={f} sheet={sheet} />
                </FilterSection>
              ))}
            </>
          )}
        </FiltersButton>
        }
      />

      {/* Tablet and desktop: ONE row of status pills (counts inside) and ONE compact period switch. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 max-[767px]:hidden">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5 min-[1100px]:gap-2">
          {(Object.keys(ATTENDANCE_TAB_LABEL) as AttendanceTab[]).map((k) => {
            const on = query.tab === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ tab: k })}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[14px] leading-none font-semibold transition-colors min-[1100px]:px-3.5 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-1 focus-visible:outline-none ${on ? "border-[#8b2252] bg-[#8b2252] text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
              >
                {ATTENDANCE_TAB_LABEL[k]}
                <span className={`tabular-nums ${on ? "text-white/90" : "text-(--ap-muted)"}`}>{tabCounts[k]}</span>
              </button>
            );
          })}
        </div>
        <DateRangeSelector value={rangeValue} onChange={setRange} presets={PRESETS} customShowsDates={false} themeClass={`admin-theme ${ADMIN_ROLE_CLASS}`} ariaLabel="Attendance period" />
      </div>
      <PhoneAttendanceTop today={t} tab={query.tab} onPick={(k) => todayOnly(k)} />
      <ActiveChips chips={appliedChips} onClearAll={clearFilters} className="mb-3 min-[768px]:hidden max-[767px]:mb-0" />
      <ActiveChips chips={scopeChips} onClearAll={clearFilters} className="mb-4 max-[767px]:hidden" />
      </div>

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          filtered ? (
            <InCard
              icon={Search}
              title="No records match"
              description="Check the spelling, or widen the date range and filters."
              action={
                <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                  <X className="size-4" aria-hidden="true" /> Clear search and filters
                </button>
              }
            />
          ) : (
            <InCard icon={Clock3} {...EMPTY_BY_TAB[query.tab]} />
          )
        ) : (
          <>
            <Table rows={page.rows} />
            <h2 className="mb-2 px-1 text-[17px] font-bold text-(--ap-ink) min-[768px]:hidden">Attendance ({page.total})</h2>
            <Cards rows={page.rows} />
          </>
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={() => setQuery((q) => ({ ...q, pageSize: q.pageSize + stepNow() }))} onClear={filtered ? clearAll : null} />
      </section>
    </div>
  );
}

const COLS = "grid-cols-[minmax(0,1.7fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,.9fr)]";

function Table({ rows }: { rows: AttendanceRow[] }) {
  return (
    <div role="table" aria-label="Attendance records" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
      <div role="row" className={`sticky top-[72px] z-10 grid ${COLS} items-end gap-x-4 border-b border-(--ap-line-2) bg-(--ap-surface) px-3 py-2.5 ${TH}`}>
        <span role="columnheader">Staff</span>
        <span role="columnheader">Client / outlet</span>
        <span role="columnheader">Date / shift</span>
        <span role="columnheader">In / out</span>
        <span role="columnheader">Status</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`ad-clickrow grid ${COLS} min-h-[56px] items-center gap-x-4 border-t border-(--ap-line-2) px-3 py-2 first:border-t-0 hover:bg-(--ap-tint-soft)`}>
          <div role="cell" className="min-w-0">
            <span className="flex min-w-0 items-center gap-3">
              <AdminAvatar name={r.staff.name} photoUrl={r.staff.photoUrl} size={36} />
              <span className="min-w-0 leading-tight">
                <Link href={staffHref(r.staff.id)} className="block text-[14px] font-bold break-words text-(--ap-ink) hover:text-(--ap-violet)">
                  {r.staff.name}
                </Link>
                <span className="mt-0.5 block text-[12px] break-words text-(--ap-muted)">{r.role}</span>
              </span>
            </span>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <span className="block text-[14px] break-words text-(--ap-ink-2)">{r.outlet}</span>
            <span className="mt-0.5 block text-[12px] break-words text-(--ap-muted)">{r.client}</span>
          </div>
          <div role="cell" className="min-w-0 leading-tight">
            <Link href={attendanceHref(r.id)} className="block text-[14px] font-semibold text-(--ap-ink) hover:text-(--ap-violet)">
              {dayLabelOf(r.date)}
            </Link>
            <span className="mt-0.5 block text-[12px] text-(--ap-muted) tabular-nums">
              {r.shiftLabel} · {clockRange(r.shiftStart, r.shiftEnd)}
            </span>
          </div>
          <div role="cell" className="min-w-0 leading-tight tabular-nums">
            <span className="block text-[14px] text-(--ap-ink-2)">{clockOf(r.checkIn) ?? <span className="text-(--ap-faint)">No check-in</span>}</span>
            <span className="mt-0.5 block text-[12px] text-(--ap-muted)">{clockOf(r.checkOut) ? `Out ${clockOf(r.checkOut)}` : "No check-out"}</span>
          </div>
          <div role="cell" className="min-w-0">
            <StatusPill status={r.status} />
            {r.flags.length ? (
              <div className="mt-1">
                <FlagChips flags={r.flags} />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cards({ rows }: { rows: AttendanceRow[] }) {
  return (
    <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
      {rows.map((r) => (
        <li key={r.id} className={CARD_ITEM}>
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
              <Link href={attendanceHref(r.id)} className="sr-only">
                Open record
              </Link>
              <StaffCell staff={r.staff} size={42} sub={`${dayLabelOf(r.date)} · ${clockOf(r.checkIn) ?? "no check-in"} · ${r.client}`} />
            </div>
            <span className="shrink-0"><AttendanceMark status={r.status} /></span>
          </div>
          {r.flags.length ? (
            <div className="mt-1.5 max-[767px]:hidden">
              <FlagChips flags={r.flags} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
