"use client";

/**
 * TEMPORARY design comparison (project lead, 2026-09-30): the same fixture
 * data drawn by our own SVG chart parts (left) and by Recharts (right), so the
 * lead can choose. Delete this folder + app/client/analytics/compare once a
 * direction is picked.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, dayMonth, todayISO } from "@/lib/client/format";
import { useAttendanceSummary, useAttendanceTrend, useWorkforceDistribution } from "@/lib/client/hooks";
import { DEPARTMENT_COLOR, DonutChart, HorizontalBarChart, StackedBarChart, STATUS_COLOR, TrendChart, type StackedBarPoint, type TrendPoint } from "../charts";

/** Recharts writes colours as SVG attributes, which can't read CSS variables - resolve the tokens (cached per key). */
const tokenCache = new Map<string, Record<string, string>>();
const EMPTY: Record<string, string> = {};
function useTokens(names: string[]): Record<string, string> {
  const key = names.join(",");
  return useSyncExternalStore(
    () => () => {},
    () => {
      const hit = tokenCache.get(key);
      if (hit) return hit;
      const el = document.querySelector(".applicant-shell") ?? document.documentElement;
      const cs = getComputedStyle(el);
      const next: Record<string, string> = {};
      for (const n of names) next[n] = cs.getPropertyValue(n).trim() || "#888";
      tokenCache.set(key, next);
      return next;
    },
    () => EMPTY,
  );
}
const v = (css: string) => css.replace(/^var\((.+)\)$/, "$1");

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Pair({ title, note, ours, theirs }: { title: string; note: string; ours: ReactNode; theirs: ReactNode }) {
  return (
    <section className="ap-card rounded-[20px] p-4 min-[768px]:p-6">
      <h2 className="text-[18px] font-bold text-(--ap-ink)">{title}</h2>
      <p className="ap-sm mt-0.5 mb-4">{note}</p>
      <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-(--ap-line) p-4">
          <div className="ap-eb mb-3">A · Our charts (current)</div>
          {ours}
        </div>
        <div className="min-w-0 rounded-2xl border border-(--ap-line) p-4">
          <div className="ap-eb mb-3">B · Recharts</div>
          {theirs}
        </div>
      </div>
    </section>
  );
}

function RcTooltip({ active, payload, label, suffix = "" }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-(--ap-line) bg-(--ap-surface) px-3 py-2 text-[13px] shadow-(--ap-shadow)">
      {label ? <b className="mb-1 block text-(--ap-ink)">{label}</b> : null}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-(--ap-ink-2)">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <b className="tabular-nums">
            {p.value}
            {suffix}
          </b>
        </div>
      ))}
    </div>
  );
}

export function ChartsCompare() {
  const today = todayISO();
  const from = addDays(today, -6);
  const trend = useAttendanceTrend(from, today);
  const summary = useAttendanceSummary(today);
  const dist = useWorkforceDistribution();
  const tok = useTokens(["--ap-violet", "--ap-ok", "--ap-warn", "--ap-rose", "--ap-info", "--ap-line", "--ap-muted", "--client-c1", "--client-c2", "--client-c3", "--client-c4", "--client-c5"]);

  if (trend.status !== "ready" || summary.status !== "ready" || dist.status !== "ready" || !trend.data || !summary.data || !dist.data) {
    return <div className="ap-sk-box h-[420px] rounded-[20px]" />;
  }
  const days = trend.data;
  const s = summary.data;
  const label = (d: string) => WEEKDAY[new Date(`${d}T12:00:00`).getDay()];

  // ---- shared shapes ----
  const trendPoints: TrendPoint[] = days.map((d) => ({
    id: d.date,
    label: label(d.date),
    sub: dayMonth(d.date),
    title: dayMonth(d.date),
    value: d.attendanceRate,
    rows: [
      { label: "Scheduled", value: String(d.scheduled) },
      { label: "Present", value: String(d.present) },
    ],
  }));
  const stackPoints: StackedBarPoint[] = days.map((d) => ({
    id: d.date,
    label: label(d.date),
    sub: dayMonth(d.date),
    title: dayMonth(d.date),
    segments: [
      { key: "present", label: "Present", value: d.present, color: STATUS_COLOR.present },
      { key: "late", label: "Late", value: d.late, color: STATUS_COLOR.late },
      { key: "absent", label: "Absent", value: d.absent, color: STATUS_COLOR.absent },
      { key: "on-leave", label: "On leave", value: d.onLeave, color: STATUS_COLOR["on-leave"] },
    ],
  }));
  const rc = days.map((d) => ({ day: `${label(d.date)} ${dayMonth(d.date)}`, rate: d.attendanceRate, Present: d.present, Late: d.late, Absent: d.absent, "On leave": d.onLeave }));
  const donut = [
    { key: "present", label: "Present", value: s.present, color: STATUS_COLOR.present },
    { key: "late", label: "Late", value: s.late, color: STATUS_COLOR.late },
    { key: "absent", label: "Absent", value: s.absent, color: STATUS_COLOR.absent },
    { key: "on-leave", label: "On leave", value: s.onLeave, color: STATUS_COLOR["on-leave"] },
  ];
  const axis = { fontSize: 11, fill: tok["--ap-muted"] };
  // Zoom the rate axis to the data so the curve actually shows its waves (a 0-100 axis flattens 88-92% into a line).
  const rates = days.map((d) => d.attendanceRate);
  const rateLo = Math.max(0, Math.floor((Math.min(...rates) - 8) / 5) * 5);
  const rateHi = Math.min(100, Math.ceil((Math.max(...rates) + 3) / 5) * 5);
  const rateMid = Math.round((rateLo + rateHi) / 2);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="ap-eb">Design comparison · temporary</div>
        <h1 className="ap-serif mt-1 text-[34px] leading-tight max-[767px]:text-[28px]">Charts: ours vs Recharts</h1>
        <p className="ap-bd mt-1.5 max-w-[70ch]">Same data (Kalina Abuja, last 7 days) drawn both ways. Hover or tap to compare the details. Pick A or B and the other goes.</p>
      </div>

      <Pair
        title="Attendance trend"
        note="Attendance rate per day."
        ours={<TrendChart points={trendPoints} height={240} summary="Attendance rate by day" />}
        theirs={
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rc} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rc-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={tok["--ap-violet"]} stopOpacity={0.38} />
                    <stop offset="55%" stopColor={tok["--ap-violet"]} stopOpacity={0.12} />
                    <stop offset="1" stopColor={tok["--ap-violet"]} stopOpacity={0} />
                  </linearGradient>
                  <filter id="rc-glow" x="-10%" y="-20%" width="120%" height="150%">
                    <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor={tok["--ap-violet"]} floodOpacity="0.32" />
                  </filter>
                </defs>
                <CartesianGrid stroke={tok["--ap-line"]} strokeDasharray="2 6" strokeOpacity={0.7} vertical={false} />
                <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} tickMargin={8} interval={0} tickFormatter={(d: string) => d.split(" ")[0]} />
                <YAxis domain={[rateLo, rateHi]} ticks={[rateLo, rateMid, rateHi]} tickFormatter={(n) => `${n}%`} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip content={<RcTooltip suffix="%" />} cursor={{ stroke: tok["--ap-violet"], strokeOpacity: 0.35, strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  name="Attendance rate"
                  stroke={tok["--ap-violet"]}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  fill="url(#rc-fill)"
                  style={{ filter: "url(#rc-glow)" }}
                  dot={false}
                  activeDot={{ r: 7, fill: "#fff", stroke: tok["--ap-violet"], strokeWidth: 3.5 }}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        }
      />

      <Pair
        title="Attendance by day"
        note="Present / late / absent / on leave, stacked."
        ours={<StackedBarChart points={stackPoints} height={240} summary="Attendance by day" />}
        theirs={
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rc} margin={{ top: 16, right: 12, left: -16, bottom: 0 }} barCategoryGap="32%">
                <CartesianGrid stroke={tok["--ap-line"]} strokeDasharray="2 6" strokeOpacity={0.7} vertical={false} />
                <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} tickMargin={8} interval={0} tickFormatter={(d: string) => d.split(" ")[0]} />
                <YAxis tick={axis} tickLine={false} axisLine={false} />
                <Tooltip content={<RcTooltip />} cursor={{ fill: tok["--ap-line"], opacity: 0.3, radius: 10 }} />
                <Bar dataKey="Present" stackId="a" fill={tok["--ap-ok"]} stroke="#fff" strokeWidth={2} animationDuration={900} />
                <Bar dataKey="Late" stackId="a" fill={tok["--ap-warn"]} stroke="#fff" strokeWidth={2} animationDuration={900} />
                <Bar dataKey="Absent" stackId="a" fill={tok["--ap-rose"]} stroke="#fff" strokeWidth={2} animationDuration={900} />
                <Bar dataKey="On leave" stackId="a" fill={tok["--ap-info"]} radius={[10, 10, 0, 0]} stroke="#fff" strokeWidth={2} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        }
      />

      <Pair
        title="Attendance today"
        note="Composition ring."
        ours={
          <div className="flex justify-center">
            <DonutChart segments={donut} centerValue={`${s.attendanceRate}%`} centerLabel="Present" ariaLabel="Attendance today" />
          </div>
        }
        theirs={
          <div className="relative mx-auto h-[190px] w-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<RcTooltip />} />
                <Pie data={donut} dataKey="value" nameKey="label" innerRadius={60} outerRadius={84} paddingAngle={4} cornerRadius={8} stroke="none" startAngle={90} endAngle={-270} animationDuration={1000}>
                  {donut.map((d) => (
                    <Cell key={d.key} fill={tok[v(d.color)]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <b className="text-[26px] text-(--ap-ink)">{s.attendanceRate}%</b>
              <span className="ap-sm">Present</span>
            </div>
          </div>
        }
      />

      <Pair
        title="Staff by department"
        note="Horizontal comparison bars."
        ours={<HorizontalBarChart rows={dist.data.map((d) => ({ key: d.departmentId, label: d.label, value: d.count, color: DEPARTMENT_COLOR[d.departmentId] }))} ariaLabel="Staff by department" />}
        theirs={
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist.data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barCategoryGap="30%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={96} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip content={<RcTooltip />} cursor={{ fill: tok["--ap-line"], opacity: 0.35 }} />
                <Bar dataKey="count" name="Staff" radius={[0, 12, 12, 0]} background={{ fill: tok["--ap-line"], fillOpacity: 0.35, radius: 12 }} animationDuration={900} label={{ position: "right", fontSize: 12, fill: tok["--ap-muted"] }}>
                  {dist.data.map((d) => (
                    <Cell key={d.departmentId} fill={tok[v(DEPARTMENT_COLOR[d.departmentId])]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        }
      />
    </div>
  );
}
