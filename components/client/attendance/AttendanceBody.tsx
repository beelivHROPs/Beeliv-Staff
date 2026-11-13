"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroCard, IconDisc } from "@/components/shared/premium";
import { staffHref } from "@/lib/client/links";
import { Exclaim, Clock3, DoorOpen, Check, Search, UsersRound } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { Reveal } from "@/components/applicant/motion";
import { useAttendanceRecords } from "@/lib/client/hooks";
import { addDays, dayMonth, formatClock, formatPercent, fullDay, plural, share, todayISO, weekday } from "@/lib/client/format";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER, SHIFTS } from "@/lib/client/labels";
import { useOutletState } from "@/lib/client/outlet";
import { analyticsFamilyHref } from "@/lib/client/links";
import { useUrlParams } from "@/lib/client/url-state";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/client/types";
import { MoreActions, PhoneFilterBar, PhoneSkeleton, type PhoneFilterGroup } from "../phone";
import { useIsPhone } from "@/components/applicant/motion";
import { AnalyticsLink } from "../AnalyticsLink";
import { PersonPhoto } from "../PersonPhoto";
import { FILTER_ROW, FilterSelect } from "../records-filters";
import { AttendanceChip } from "../StatusChip";
import { AnalyticsPanel, ChartEmptyState, DateRangeSelector, resolveRange, STATUS_LABEL, type PresetOption, type RangeValue } from "../charts";
import { AttendanceBodySkeleton, AttendanceError } from "./AttendanceStates";

const ALL = "all";
const PAGE = 25;
const ORDER: AttendanceStatus[] = ["present", "late", "absent", "on-leave"];
/** Status filter values: the four recorded statuses, plus "checked-in" (any recorded clock-in - the Overview's "On shift" list). */
type StatusFilter = AttendanceStatus | "checked-in";
const STATUS_VALUES: StatusFilter[] = ["present", "late", "absent", "on-leave", "checked-in"];

const PRESETS: PresetOption[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Week" },
  { key: "30d", label: "Month" },
];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Range from the URL: ?range=today|7d|30d|custom(&from&to), or the Overview's ?date=today|YYYY-MM-DD. Default: today. */
function rangeFromUrl(get: (k: string) => string): RangeValue {
  const today = todayISO();
  const r = get("range");
  if (r === "custom") {
    const from = get("from");
    const to = get("to");
    if (ISO.test(from) && ISO.test(to) && from <= to && to <= today) return { preset: "custom", from, to };
    return resolveRange("today");
  }
  if (r === "today" || r === "7d" || r === "30d") return resolveRange(r);
  const date = get("date");
  if (ISO.test(date) && date <= today) return date === today ? resolveRange("today") : { preset: "custom", from: date, to: date };
  return resolveRange("today");
}

const matchesStatus = (r: AttendanceRecord, s: StatusFilter | typeof ALL) => (s === ALL ? true : s === "checked-in" ? r.clockIn !== null : r.status === s);

/**
 * Attendance (brief section 19). One period switch (Today / Week / Month /
 * Custom) and filters at the top; a five-figure summary, then the actual staff records. Every number,
 * ring segment and bar is computed from the SAME filtered records listed
 * below, so analytics always lead to records. The status filter only narrows
 * the records list (the summary and charts keep showing the whole composition
 * so the figures can be compared); selecting a figure applies it.
 * Period, department, role, status and outlet live in the URL.
 */
export function AttendanceBody() {
  const url = useUrlParams();
  const outlet = useOutletState();
  const allOutlets = outlet.scope === "all";
  const today = todayISO();

  const range = rangeFromUrl(url.get);
  const department = url.get("department") || ALL;
  const role = url.get("role") || ALL;
  const outletId = url.get("outlet") || ALL;
  const rawStatus = url.get("status");
  const status: StatusFilter | typeof ALL = (STATUS_VALUES as string[]).includes(rawStatus) ? (rawStatus as StatusFilter) : ALL;

  // One fetch: the selected period, widened to the last 7 days when the period is a single day so the trend has context.
  const single = range.from === range.to;
  const fetchFrom = single ? addDays(range.to, -6) : range.from;
  const { data, status: load, retry } = useAttendanceRecords(fetchFrom, range.to);
  const [shown, setShown] = useState(PAGE);
  const phone = useIsPhone();

  const all = useMemo(() => data ?? [], [data]);
  const roles = useMemo(() => [...new Set(all.map((r) => r.role))].sort((a, b) => a.localeCompare(b)), [all]);

  // Records that satisfy the department / role / outlet filters (the status filter is applied after, for the list only).
  const scoped = useMemo(() => all.filter((r) => (department === ALL || r.departmentId === department) && (role === ALL || r.role === role) && (!allOutlets || outletId === ALL || r.outletId === outletId)), [all, department, role, outletId, allOutlets]);
  const inRange = useMemo(() => scoped.filter((r) => r.date >= range.from && r.date <= range.to), [scoped, range.from, range.to]);
  const list = useMemo(() => inRange.filter((r) => matchesStatus(r, status)), [inRange, status]);

  const count = (s: AttendanceStatus) => inRange.filter((r) => r.status === s).length;
  const totals = { scheduled: inRange.length, present: count("present"), late: count("late"), absent: count("absent"), "on-leave": count("on-leave") };
  const rate = totals.scheduled ? Math.round((totals.present / totals.scheduled) * 1000) / 10 : 0;

  const filtersOn = department !== ALL || role !== ALL || (allOutlets && outletId !== ALL);
  const setFilter = (patch: Record<string, string | undefined>) => {
    setShown(PAGE);
    url.set(Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === ALL ? undefined : v])));
  };
  const setRange = (v: RangeValue) => {
    setShown(PAGE);
    url.set({ date: undefined, range: v.preset, from: v.preset === "custom" ? v.from : undefined, to: v.preset === "custom" ? v.to : undefined });
  };
  const clearFilters = () => setFilter({ department: undefined, role: undefined, outlet: undefined, status: undefined });

  const periodLabel = single ? (range.to === today ? `Today, ${fullDay(range.to)}` : fullDay(range.to)) : `${dayMonth(range.from)} - ${dayMonth(range.to)}`;
  // Analytics offers 7 / 30 days, so "Today" carries over as the 7-day view.
  const analyticsHref = analyticsFamilyHref("attendance", {
    range: range.preset === "30d" ? "30d" : range.preset === "custom" ? undefined : "7d",
    department: department === ALL ? undefined : department,
    role: role === ALL ? undefined : role,
    status: status === ALL || status === "checked-in" ? undefined : status,
  });
  const phoneGroups: PhoneFilterGroup[] = [
    { key: "department", title: "Department", value: department, onChange: (v) => setFilter({ department: v }), options: [{ value: ALL, label: "All" }, ...DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))] },
    { key: "role", title: "Role", value: role, onChange: (v) => setFilter({ role: v }), options: [{ value: ALL, label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))] },
    { key: "status", title: "Status", value: status, onChange: (v) => setFilter({ status: v }), options: [{ value: ALL, label: "All" }, ...ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] })), { value: "checked-in", label: "Checked in" }] },
    ...(allOutlets ? [{ key: "outlet", title: "Outlet", value: outletId, onChange: (v: string) => setFilter({ outlet: v }), options: [{ value: ALL, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))] }] : []),
  ];
  const scopeName = allOutlets ? "all outlets" : (outlet.outlets.find((o) => o.id === outlet.scope)?.name ?? "this outlet");

  return (
    <>
      <PhoneAttendance
        load={load}
        retry={retry}
        range={range}
        setRange={setRange}
        periodLabel={periodLabel}
        single={single}
        totals={totals}
        rate={rate}
        records={inRange}
        status={status}
        onPick={(s) => setFilter({ status: s === status ? ALL : s })}
        groups={phoneGroups}
        active={[department, role, status, allOutlets ? outletId : ALL].filter((v) => v !== ALL).length}
        resultCount={list.length}
        onReset={clearFilters}
        analyticsHref={analyticsHref}
      />
      <div className="max-[767px]:hidden">
      <PageHeading title="Attendance" subtitle={`Who is working, who is late and who is away at ${scopeName}.`} right={<MoreActions actions={[{ label: "View attendance analytics", href: analyticsHref }]} />} />

      <Reveal as="section" aria-label="Period and filters" className="ap-card mb-4 flex flex-col gap-3 rounded-[18px] p-4 min-[768px]:mb-5 min-[768px]:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <DateRangeSelector value={range} onChange={setRange} presets={PRESETS} customShowsDates={false} ariaLabel="Attendance period" className="w-full min-[768px]:w-auto" />
          <p className="text-[14px] font-semibold text-(--ap-ink-2) max-[767px]:hidden" aria-live="polite">
            {periodLabel}
          </p>
        </div>
        <PhoneFilterBar
          lead={periodLabel}
          groups={phoneGroups}
          active={[department, role, status, allOutlets ? outletId : ALL].filter((v) => v !== ALL).length}
          resultCount={list.length}
          onReset={clearFilters}
        />
        <div className={`${FILTER_ROW} max-[767px]:hidden`}>
          <FilterSelect label="Department" value={department} onChange={(v) => setFilter({ department: v })} options={[{ value: ALL, label: "All departments" }, ...DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))]} />
          <FilterSelect label="Role" value={role} onChange={(v) => setFilter({ role: v })} options={[{ value: ALL, label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))]} />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter({ status: v })}
            options={[{ value: ALL, label: "All statuses" }, ...ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] })), { value: "checked-in", label: "Checked in" }]}
          />
          {allOutlets ? <FilterSelect label="Outlet" value={outletId} onChange={(v) => setFilter({ outlet: v })} options={[{ value: ALL, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))]} /> : null}
        </div>
      </Reveal>

      {load === "loading" ? <AttendanceBodySkeleton /> : null}
      {load === "error" || load === "restricted" ? <AttendanceError retry={retry} /> : null}
      {load === "empty" ? (
        <div className="ap-card rounded-[20px] p-4 min-[768px]:p-6">
          <ChartEmptyState icon={Clock3} title="No attendance records for this period" description="Attendance appears once your staff are scheduled and clock in. Try a different period, or check back later. Nothing is estimated in the meantime." height={220} />
        </div>
      ) : null}

      {load === "ready" ? (
        <div className="flex flex-col gap-4 min-[768px]:gap-5">
          <div className="max-[767px]:hidden">
            <AnalyticsLink href={analyticsHref} label="View attendance analytics" />
          </div>
          <Summary totals={totals} rate={rate} status={status} onPick={(s) => setFilter({ status: s === status ? ALL : s })} single={single} />

          <Records
            rows={list}
            total={inRange.length}
            shown={phone ? shown - 15 : shown}
            onMore={() => setShown((n) => n + PAGE)}
            showDate={!single}
            showOutlet={allOutlets}
            outletName={(id) => outlet.outlets.find((o) => o.id === id)?.name ?? ""}
            status={status}
            filtersOn={filtersOn}
            onClear={clearFilters}
            periodLabel={periodLabel}
          />

        </div>
      ) : null}
      </div>
    </>
  );
}

const SEG = { present: "#6ee7a0", late: "#fcd34d", absent: "#fb7185", "on-leave": "#7dd3fc" } as const;

/** Phone page: eyebrow + title, one plum hero with rate and a segmented bar, four breakdown tiles, then Needs attention cards. */
function PhoneAttendance({
  load, retry, range, setRange, periodLabel, single, totals, rate, records, status, onPick, groups, active, resultCount, onReset, analyticsHref,
}: {
  load: string;
  retry: () => void;
  range: RangeValue;
  setRange: (v: RangeValue) => void;
  periodLabel: string;
  single: boolean;
  totals: Totals;
  rate: number;
  records: AttendanceRecord[];
  status: StatusFilter | typeof ALL;
  onPick: (s: AttendanceStatus) => void;
  groups: PhoneFilterGroup[];
  active: number;
  resultCount: number;
  onReset: () => void;
  analyticsHref: string;
}) {
  const [all, setAll] = useState(false);
  const attention = records.filter((r) => r.status === "late" || r.status === "absent").sort((a, b) => (a.date === b.date ? a.staffName.localeCompare(b.staffName) : b.date.localeCompare(a.date)));
  const rows = all ? attention : attention.slice(0, 4);
  const tiles: { key: AttendanceStatus; icon: LucideIcon; label: string; num: string; bg: string }[] = [
    { key: "present", icon: Check, label: "Present", num: "text-[#15803D] dark:text-[#4ade80]", bg: "rgba(34,197,94,.12)" },
    { key: "late", icon: Clock3, label: "Late", num: "text-[#B45309] dark:text-[#fbbf24]", bg: "rgba(245,158,11,.14)" },
    { key: "absent", icon: Exclaim, label: "Absent", num: "text-[#BE123C] dark:text-[#fb7185]", bg: "rgba(244,63,94,.12)" },
    { key: "on-leave", icon: DoorOpen, label: "On leave", num: "text-[#1D4ED8] dark:text-[#7dd3fc]", bg: "rgba(59,130,246,.13)" },
  ];
  const seg = (n: number) => (totals.scheduled ? (n / totals.scheduled) * 100 : 0);
  return (
    <div className="flex flex-col gap-5 min-[768px]:hidden">
      <header>
        <p className="text-[12px] font-bold tracking-[.14em] text-(--ap-violet) uppercase">Workforce monitoring</p>
        <h1 className="mt-1 text-[32px] leading-none font-bold text-(--ap-ink)">Attendance</h1>
        <p className="mt-2 text-[14.5px] text-(--ap-muted)">{periodLabel}</p>
      </header>

      <DateRangeSelector value={range} onChange={setRange} presets={PRESETS} customShowsDates={false} ariaLabel="Attendance period" className="w-full" />

      {load === "loading" ? <PhoneSkeleton label="Loading attendance" header={false} tiles={4} cards={3} /> : null}
      {load === "error" || load === "restricted" ? <AttendanceError retry={retry} /> : null}
      {load === "empty" ? (
        <div className="rounded-[22px] border border-(--ap-line) bg-(--ap-surface) p-4">
          <ChartEmptyState icon={Clock3} title="No attendance records for this period" description="Attendance appears once your staff are scheduled and clock in. Nothing is estimated in the meantime." height={200} />
        </div>
      ) : null}

      {load === "ready" ? (
        <>
          <HeroCard eyebrow={single && range.to === todayISO() ? "Today's attendance" : "Attendance rate"} ariaLabel="Attendance rate">
            <p className="flex items-baseline gap-1">
              <b className="text-[52px] leading-none font-bold tabular-nums">{formatPercent(rate)}</b>
            </p>
            <p className="mt-1.5 text-[14px] text-white/90">
              {totals.scheduled ? `${totals.present} of ${totals.scheduled} scheduled staff present` : "No one scheduled"}
            </p>
            <div role="img" aria-label={`${totals.present} present, ${totals.late} late, ${totals.absent} absent, ${totals["on-leave"]} on leave`} className="mt-4 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/20">
              {(["present", "late", "absent", "on-leave"] as const).map((k) => (totals[k] > 0 ? <span key={k} style={{ width: `${seg(totals[k])}%`, background: SEG[k] }} className="h-full first:rounded-l-full last:rounded-r-full" /> : null))}
            </div>
          </HeroCard>

          <section aria-labelledby="pa-break">
            <h2 id="pa-break" className="mb-2.5 text-[16px] font-semibold text-(--ap-ink)">Attendance breakdown</h2>
            <div role="group" aria-label="Filter by status" className="grid grid-cols-2 gap-3">
              {tiles.map((t) => (
                <button key={t.key} type="button" aria-pressed={status === t.key} onClick={() => onPick(t.key)} style={{ background: t.bg }} className={`flex min-h-[96px] items-center gap-3 rounded-[20px] border p-3.5 text-left ${status === t.key ? "border-(--ap-violet)" : "border-(--ap-line)"}`}>
                  <IconDisc icon={t.icon} size={40} />
                  <span className="min-w-0 leading-tight">
                    <b className={`block text-[30px] leading-none font-bold tabular-nums ${t.num}`}>{totals[t.key]}</b>
                    <span className="mt-1 block text-[13px] font-semibold text-(--ap-ink-2)">{t.label}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <PhoneFilterBar lead={`${totals.scheduled} scheduled`} groups={groups} active={active} resultCount={resultCount} onReset={onReset} />
            </div>
          </section>

          <section aria-labelledby="pa-need">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h2 id="pa-need" className="text-[16px] font-semibold text-(--ap-ink)">Needs attention</h2>
              {attention.length > 4 ? (
                <button type="button" onClick={() => setAll((v) => !v)} className="ap-hit text-[13px] font-semibold text-(--ap-violet)">{all ? "Show less" : `View all ${attention.length}`}</button>
              ) : (
                <Link href={analyticsHref} className="ap-hit text-[13px] font-semibold text-(--ap-violet)">Analytics</Link>
              )}
            </div>
            {rows.length === 0 ? (
              <p className="rounded-[20px] border border-(--ap-line) bg-(--ap-surface) p-4 text-[14px] text-(--ap-muted)"><b className="text-(--ap-ink-2)">All clear.</b> No one is late or absent in this period.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={staffHref(r.memberId)} className="flex min-h-[68px] items-center gap-3 rounded-[20px] border border-(--ap-line) bg-(--ap-surface) p-3.5 active:bg-(--ap-tint-soft)">
                      <PersonPhoto name={r.staffName} size={44} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <b className="block truncate text-[15px] font-semibold text-(--ap-ink)">{r.staffName}</b>
                        <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">
                          {r.role} &middot; {r.status === "late" && r.clockIn ? `Clocked in ${formatClock(r.clockIn)}` : "No check-in"}
                          {!single ? ` · ${dayMonth(r.date)}` : ""}
                        </span>
                      </span>
                      <AttendanceChip status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

type Totals = { scheduled: number; present: number; late: number; absent: number; "on-leave": number };

/** Five figures. Scheduled is the total; the other four are buttons that filter the records below. */
function Summary({ totals, rate, status, onPick, single }: { totals: Totals; rate: number; status: StatusFilter | typeof ALL; onPick: (s: AttendanceStatus) => void; single: boolean }) {
  const of = (n: number) => (totals.scheduled ? `${formatPercent(share(n, totals.scheduled))} of scheduled` : "No one scheduled");
  const tiles: { key: AttendanceStatus; icon: LucideIcon; tint: string; sub: string }[] = [
    { key: "present", icon: Check, tint: "text-[#15803D]", sub: totals.scheduled ? `${formatPercent(rate)} attendance rate` : "No one scheduled" },
    { key: "late", icon: Clock3, tint: "text-[#C98A00]", sub: of(totals.late) },
    { key: "absent", icon: Exclaim, tint: "text-[#C8102E]", sub: of(totals.absent) },
    { key: "on-leave", icon: DoorOpen, tint: "text-[#2563EB]", sub: of(totals["on-leave"]) },
  ];
  const base = "ap-card flex min-w-0 flex-col gap-2.5 rounded-2xl p-3.5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:gap-3 min-[768px]:p-4";
  return (
    <Reveal as="section" aria-label="Attendance summary">
      <p className="mb-2 text-[13px] text-(--ap-muted) min-[768px]:hidden">
        <b className="text-(--ap-ink)">{totals.scheduled}</b> scheduled{totals.scheduled ? ` · ${formatPercent(rate)} present` : ""}
      </p>
      <div role="group" aria-label="Filter by status" className="cc-group grid grid-cols-4 min-[768px]:hidden">
        {tiles.map((t, i) => (
          <button key={t.key} type="button" aria-pressed={status === t.key} onClick={() => onPick(t.key)} className={`min-h-16 px-1 py-2 text-center ${i > 0 ? "border-l border-(--ap-line-2)" : ""} ${status === t.key ? "bg-(--ap-tint)" : ""}`}>
            <b className={`block text-[20px] leading-tight tabular-nums ${t.tint}`}>{totals[t.key]}</b>
            <span className="block text-[12px] font-semibold text-(--ap-ink-2)">{t.key === "on-leave" ? "Leave" : STATUS_LABEL[t.key]}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 max-[767px]:hidden gap-2.5 min-[768px]:grid-cols-5 min-[768px]:gap-3.5">
        <div className={`${base} col-span-2 min-[768px]:col-span-1`}>
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center text-(--ap-violet)">
            <UsersRound className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <b className="block text-[26px] font-bold tracking-tight text-(--ap-ink) tabular-nums min-[768px]:text-[28px]">{totals.scheduled}</b>
            <span className="block text-[14px] font-semibold text-(--ap-ink-2)">Scheduled</span>
            <span className="mt-0.5 block text-[12px] text-(--ap-muted) max-[767px]:hidden">{single ? "Staff today" : "Staff-days in period"}</span>
          </span>
        </div>
        {tiles.map((t, i) => {
          const on = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(t.key)}
              className={`${base} ap-card-hover text-left ${i < 2 ? "col-span-2" : "col-span-3"} min-[768px]:col-span-1 ${on ? "outline-2 outline-offset-0 outline-(--ap-violet)" : ""}`}
            >
              <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center ${t.tint}`}>
                <t.icon className="size-5" />
              </span>
              <span className="min-w-0 leading-tight">
                <b className="block text-[26px] font-bold tracking-tight text-(--ap-ink) tabular-nums min-[768px]:text-[28px]">{totals[t.key]}</b>
                <span className="block text-[14px] font-semibold text-(--ap-ink-2)">{STATUS_LABEL[t.key]}</span>
                <span className="mt-0.5 block text-[12px] text-(--ap-muted) max-[767px]:hidden">{t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[12.5px] text-(--ap-muted) max-[767px]:hidden">Select a figure to list only those records. {single ? "" : "Counts are staff-days across the period."}</p>
    </Reveal>
  );
}

type RecordsProps = {
  rows: AttendanceRecord[];
  total: number;
  shown: number;
  onMore: () => void;
  showDate: boolean;
  showOutlet: boolean;
  outletName: (id: string) => string;
  status: StatusFilter | typeof ALL;
  filtersOn: boolean;
  onClear: () => void;
  periodLabel: string;
};

const rowDate = (d: string) => `${weekday(d)} ${dayMonth(d)}`;

/** The actual staff records the figures above are made of: table on tablet / desktop, cards on phones. */
function Records({ rows, total, shown, onMore, showDate, showOutlet, outletName, status, filtersOn, onClear, periodLabel }: RecordsProps) {
  const visible = rows.slice(0, shown);
  const statusText = status === ALL ? "" : status === "checked-in" ? "checked in" : STATUS_LABEL[status].toLowerCase();
  return (
    <AnalyticsPanel anchor="records" title="Attendance records" subtitle={`${rows.length} of ${plural(total, "record")} · ${periodLabel}${statusText ? ` · ${statusText}` : ""}`}>
      {rows.length === 0 ? (
        <ChartEmptyState
          icon={Search}
          title="No records match"
          description={statusText ? `No one is recorded as ${statusText} for this period with the current filters.` : "No records match the current filters."}
          action={
            status !== ALL || filtersOn ? (
              <button type="button" onClick={onClear} className="ap-btn ap-btn-s ap-btn-sm mt-1">
                Clear filters
              </button>
            ) : undefined
          }
          height={160}
        />
      ) : (
        <>
          <div className="max-[767px]:hidden">
            <table className="w-full border-collapse text-left text-[14px]">
              <caption className="sr-only">Staff attendance records for {periodLabel}</caption>
              <thead>
                <tr className="text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
                  {showDate ? <th scope="col" className="pb-2 font-bold">Date</th> : null}
                  <th scope="col" className="pb-2 font-bold">Staff</th>
                  <th scope="col" className="pb-2 font-bold">Role</th>
                  <th scope="col" className="pb-2 font-bold max-[1100px]:hidden">Department</th>
                  {showOutlet ? <th scope="col" className="pb-2 font-bold max-[1240px]:hidden">Outlet</th> : null}
                  <th scope="col" className="pb-2 font-bold">Shift</th>
                  <th scope="col" className="pb-2 font-bold">Clock-in</th>
                  <th scope="col" className="pb-2 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-(--ap-line-2)">
                    {showDate ? <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2)">{rowDate(r.date)}</td> : null}
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2.5">
                        <PersonPhoto name={r.staffName} size={30} />
                        <span className="min-w-0 leading-tight">
                          <b className="block font-semibold text-(--ap-ink)">{r.staffName}</b>
                          <span className="block text-[12px] text-(--ap-muted) tabular-nums">{r.staffId}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-(--ap-ink-2)">{r.role}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2) max-[1100px]:hidden">{DEPARTMENT_LABEL[r.departmentId]}</td>
                    {showOutlet ? <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2) max-[1240px]:hidden">{outletName(r.outletId)}</td> : null}
                    <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2)">{SHIFTS[r.shift].label}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2) tabular-nums">{r.clockIn ? formatClock(r.clockIn) : <span className="text-(--ap-faint)">-</span>}</td>
                    <td className="py-2.5 text-right">
                      <AttendanceChip status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="Attendance records" className="m-0 flex list-none flex-col p-0 min-[768px]:hidden">
            {visible.map((r) => (
              <li key={r.id} className="flex min-h-14 items-center gap-3 border-t border-(--ap-line-2) py-2 first:border-t-0">
                <PersonPhoto name={r.staffName} size={36} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block text-[15px]">{r.staffName}</b>
                  <span className="block text-[13px] text-(--ap-muted)">
                    {showDate ? `${rowDate(r.date)} · ` : ""}
                    {r.clockIn ? `In ${formatClock(r.clockIn)}` : r.role}
                  </span>
                </span>
                <AttendanceChip status={r.status} />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-(--ap-muted)">
            <span>
              Showing {visible.length} of {rows.length}
            </span>
            {rows.length > shown ? (
              <button type="button" onClick={onMore} className="ap-btn ap-btn-s ap-btn-sm">
                Show more
              </button>
            ) : null}
          </div>
        </>
      )}
    </AnalyticsPanel>
  );
}
