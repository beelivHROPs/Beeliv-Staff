/**
 * DEV FIXTURE for Operations company reports. FICTIONAL. COUNTS ONLY (no money).
 * Holds no numbers of its own: everything is derived through the SERVICES of the
 * Recruitment Reports and Business-at-a-glance fixtures (scope "all"), plus the
 * Operations assignments store for "who holds this client now", the way a server
 * would aggregate. Known mock simplifications (not decided here): placements are
 * attributed to the HR officer who holds the client TODAY, not at the time of
 * placement; "HR workload" is a live snapshot so the date range does not apply;
 * the weekly / monthly period split and week start are PROVISIONAL (needs Beeliv
 * confirmation). Replace with a Supabase adapter implementing OpsReportsAdapter.
 *
 * Previews: ?state=restricted (403), the shell's "Prototype state" control
 * (loading / empty / error).
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getGlance } from "../glance/service";
import type { GlanceData } from "../glance/types";
import { getReport } from "../reports/service";
import { currentHrByClient, HR_OFFICERS } from "./assignments-mock";
import type { OpsReportsAdapter } from "./opsreports-adapter";
import type { OpsColumn, OpsReportData, OpsReportFacets, OpsReportHubEntry, OpsReportId, OpsReportQuery, OpsRow } from "./opsreports-types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(notify);

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(250);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

/* ---------- dates ---------- */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayMon = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

interface Win {
  key: string;
  label: string;
  from: string;
  to: string;
}

/** Up to 45 days: 7-day blocks; longer: calendar months (at most the last 12). PROVISIONAL split. */
function windows(from: string, to: string): Win[] {
  const f = parse(from);
  const t = parse(to);
  const span = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
  const out: Win[] = [];
  if (span <= 45) {
    for (let c = f; c <= t; c = addDays(c, 7)) {
      const end = addDays(c, 6) > t ? t : addDays(c, 6);
      out.push({ key: iso(c), label: dayMon(c), from: iso(c), to: iso(end) });
    }
    return out;
  }
  for (let c = new Date(f.getFullYear(), f.getMonth(), 1); c <= t; c = new Date(c.getFullYear(), c.getMonth() + 1, 1)) {
    const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
    const a = c < f ? f : c;
    const b = last > t ? t : last;
    out.push({ key: iso(c).slice(0, 7), label: c.toLocaleDateString("en-GB", { month: "short" }), from: iso(a), to: iso(b) });
  }
  return out.slice(-12);
}

/* ---------- source data ---------- */

let glanceMemo: { at: number; p: Promise<GlanceData> } | null = null;
function glanceNow(): Promise<GlanceData> {
  if (!glanceMemo || Date.now() - glanceMemo.at > 4000) {
    const p = getGlance("all");
    glanceMemo = { at: Date.now(), p };
    p.catch(() => {
      glanceMemo = null;
    });
  }
  return glanceMemo.p;
}

interface ClientBlock {
  id: string;
  name: string;
  hr: { id: string; name: string } | null;
  openJobs: number;
  requestsWaiting: number;
  /** One entry per window: placements and the days each took. */
  wins: { win: Win; days: number[] }[];
}

/** Every client (after the client and HR filters) with placements per window. `single` = one window for the whole range. */
async function collect(q: { from: string; to: string; clientId: string; hrId: string }, single: boolean): Promise<ClientBlock[]> {
  const [g, hrMap] = await Promise.all([glanceNow(), currentHrByClient()]);
  const wins = single ? [{ key: "range", label: "Range", from: q.from, to: q.to }] : windows(q.from, q.to);
  const clients = g.byClient.filter((c) => (!q.clientId || c.id === q.clientId) && (!q.hrId || hrMap.get(c.id)?.id === q.hrId));
  return Promise.all(
    clients.map(async (c) => ({
      id: c.id,
      name: c.name,
      hr: hrMap.get(c.id) ?? null,
      openJobs: c.openJobs,
      requestsWaiting: c.requestsWaiting,
      wins: await Promise.all(wins.map(async (win) => ({ win, days: (await getReport({ report: "placement", from: win.from, to: win.to, clientId: c.id, vacancyId: "" })).rows.map((r) => Number(r.cells.d)) }))),
    })),
  );
}

const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);
const avg = (a: number[]) => (a.length ? Math.round(sum(a) / a.length) : null);
const str = (n: number | null) => (n === null ? "None" : String(n));
const allDays = (b: ClientBlock[]) => b.flatMap((c) => c.wins.flatMap((w) => w.days));
const base = (report: OpsReportId, title: string, asOf: "range" | "now") => ({ report, title, generatedAt: new Date().toISOString(), asOf, total: 0 });

const emptyData = (q: OpsReportQuery, title: string, chartTitle: string, asOf: "range" | "now"): OpsReportData => ({
  ...base(q.report, title, asOf),
  chartTitle,
  chart: { kind: "bars", unit: "", rows: [] },
  summary: "Nothing to show yet.",
  kpis: [],
  columns: [],
  rows: [],
  workspaceEmpty: true,
});

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- builders ---------- */

async function placements(q: OpsReportQuery): Promise<OpsReportData> {
  const blocks = await collect(q, q.group !== "time");
  const days = allDays(blocks);
  const total = days.length;
  const kpis = [
    { key: "n", label: "Placements", value: String(total) },
    { key: "c", label: "Clients served", value: String(blocks.filter((b) => b.wins.some((w) => w.days.length)).length) },
    { key: "d", label: "Average days to place", value: str(avg(days)), sub: "from application" },
  ];
  const head = base("placements", "Placements", "range");

  if (q.group === "client") {
    const rows = blocks.map((b) => ({ b, d: b.wins.flatMap((w) => w.days) })).sort((x, y) => y.d.length - x.d.length || x.b.name.localeCompare(y.b.name));
    const columns: OpsColumn[] = [{ key: "c", label: "Client" }, { key: "h", label: "HR officer" }, { key: "n", label: "Placements", align: "right" }, { key: "d", label: "Average days", align: "right" }];
    return {
      ...head, chartTitle: "Placements by client", chart: { kind: "bars", unit: "placements", rows: rows.map(({ b, d }) => ({ key: b.id, label: b.name, value: d.length })) },
      summary: `Placements for each of ${rows.length} clients in this period.`, kpis, columns,
      rows: rows.map(({ b, d }) => ({ id: b.id, href: `/admin/ops/assignments/${b.id}`, cells: { c: b.name, h: b.hr?.name ?? "No HR assigned", n: String(d.length), d: str(avg(d)) } })),
      total: rows.length, workspaceEmpty: false,
    };
  }
  if (q.group === "hr") {
    const groups = new Map<string, { name: string; id: string | null; clients: number; d: number[] }>();
    blocks.forEach((b) => {
      const k = b.hr?.id ?? "none";
      const g = groups.get(k) ?? { name: b.hr?.name ?? "No HR assigned", id: b.hr?.id ?? null, clients: 0, d: [] };
      g.clients += 1;
      g.d.push(...b.wins.flatMap((w) => w.days));
      groups.set(k, g);
    });
    HR_OFFICERS.filter((h) => !q.hrId || h.id === q.hrId).forEach((h) => groups.has(h.id) || groups.set(h.id, { name: h.name, id: h.id, clients: 0, d: [] }));
    const rows = [...groups.entries()].map(([key, g]) => ({ key, ...g })).sort((x, y) => y.d.length - x.d.length || x.name.localeCompare(y.name));
    const columns: OpsColumn[] = [{ key: "h", label: "HR officer" }, { key: "c", label: "Clients", align: "right" }, { key: "n", label: "Placements", align: "right" }, { key: "d", label: "Average days", align: "right" }];
    return {
      ...head, chartTitle: "Placements by HR officer", chart: { kind: "bars", unit: "placements", rows: rows.map((r) => ({ key: r.key, label: r.name, value: r.d.length })) },
      summary: `Placements for each HR officer, by the clients they hold today.`, kpis, columns,
      rows: rows.map((r) => ({ id: r.key, href: r.id ? `/admin/ops/assignments?hr=${r.id}` : "/admin/ops/assignments?show=unassigned", cells: { h: r.name, c: String(r.clients), n: String(r.d.length), d: str(avg(r.d)) } })),
      total: rows.length, workspaceEmpty: false,
    };
  }
  const first = blocks[0]?.wins ?? [];
  const per = first.map((w, i) => ({ win: w.win, d: blocks.flatMap((b) => b.wins[i].days) }));
  const columns: OpsColumn[] = [{ key: "p", label: "Period" }, { key: "n", label: "Placements", align: "right" }, { key: "d", label: "Average days", align: "right" }];
  return {
    ...head, chartTitle: "Placements over time", chart: { kind: "line", unit: "placements", points: per.map((p) => ({ key: p.win.key, label: p.win.label, value: p.d.length })) },
    summary: `Placements in each period, ${plural(total, "placement")} in total.`, kpis, columns,
    rows: per.map((p) => ({ id: p.win.key, cells: { p: p.win.from === p.win.to ? p.win.from : `${dayMon(parse(p.win.from))} to ${dayMon(parse(p.win.to))}`, n: String(p.d.length), d: str(avg(p.d)) } })),
    total: per.length, workspaceEmpty: false,
  };
}

const STAGES = ["Applied", "Shortlisted", "Interviewed", "Offered", "Placed"];

async function funnelCounts(q: { from: string; to: string; clientId: string; hrId: string }) {
  const [g, hrMap] = await Promise.all([glanceNow(), currentHrByClient()]);
  const clients = g.byClient.filter((c) => (!q.clientId || c.id === q.clientId) && (!q.hrId || hrMap.get(c.id)?.id === q.hrId));
  const reports = await Promise.all(clients.map((c) => getReport({ report: "pipeline", from: q.from, to: q.to, clientId: c.id, vacancyId: "" })));
  return STAGES.map((s) =>
    sum(
      reports.map((r) => {
        const sp = r.charts.find((x) => x.id === "funnel")?.spec;
        return sp && sp.kind === "bars" ? (sp.rows.find((x) => x.label === s)?.value ?? 0) : 0;
      }),
    ),
  );
}

async function funnel(q: OpsReportQuery): Promise<OpsReportData> {
  const counts = await funnelCounts(q);
  const applied = counts[0];
  const pct = (n: number) => (applied ? `${Math.round((n / applied) * 100)}%` : "None");
  return {
    ...base("funnel", "Recruitment funnel", "range"),
    chartTitle: "Applicants by furthest stage",
    chart: { kind: "bars", unit: "applicants", rows: STAGES.map((s, i) => ({ key: s, label: s, value: counts[i] })) },
    summary: `Of ${applied} applicants, ${counts[4]} were placed.`,
    kpis: [{ key: "a", label: "Applied", value: String(applied) }, { key: "p", label: "Placed", value: String(counts[4]) }, { key: "r", label: "Placed of applied", value: pct(counts[4]) }],
    columns: [{ key: "s", label: "Stage" }, { key: "n", label: "Applicants", align: "right" }, { key: "o", label: "Of applied", align: "right" }, { key: "x", label: "Left since last stage", align: "right" }],
    rows: STAGES.map((s, i) => ({ id: s, cells: { s, n: String(counts[i]), o: pct(counts[i]), x: i === 0 ? "-" : String(Math.max(0, counts[i - 1] - counts[i])) } })),
    total: STAGES.length,
    workspaceEmpty: false,
  };
}

async function timeToPlace(q: OpsReportQuery): Promise<OpsReportData> {
  const blocks = await collect(q, false);
  const days = allDays(blocks);
  const first = blocks[0]?.wins ?? [];
  const per = first.map((w, i) => ({ win: w.win, d: blocks.flatMap((b) => b.wins[i].days) }));
  return {
    ...base("time-to-place", "Time to place", "range"),
    chartTitle: "Average days from application to placed",
    chart: { kind: "line", unit: "days", points: per.map((p) => ({ key: p.win.key, label: p.win.label, value: avg(p.d) })) },
    summary: days.length ? `Average ${avg(days)} days from application to placed across ${plural(days.length, "placement")}.` : "No placements in this period.",
    kpis: [{ key: "a", label: "Average days", value: str(avg(days)), sub: "from application" }, { key: "f", label: "Fastest", value: days.length ? String(Math.min(...days)) : "None", sub: "days" }, { key: "s", label: "Slowest", value: days.length ? String(Math.max(...days)) : "None", sub: "days" }],
    columns: [{ key: "p", label: "Period" }, { key: "n", label: "Placements", align: "right" }, { key: "d", label: "Average days", align: "right" }],
    rows: per.map((p) => ({ id: p.win.key, cells: { p: p.win.from === p.win.to ? p.win.from : `${dayMon(parse(p.win.from))} to ${dayMon(parse(p.win.to))}`, n: String(p.d.length), d: str(avg(p.d)) } })),
    total: per.length,
    workspaceEmpty: false,
  };
}

async function hrWorkload(q: OpsReportQuery): Promise<OpsReportData> {
  const [g, hrMap] = await Promise.all([glanceNow(), currentHrByClient()]);
  const clients = g.byClient.filter((c) => !q.clientId || c.id === q.clientId);
  const mk = (id: string | null, name: string) => {
    const mine = clients.filter((c) => (hrMap.get(c.id)?.id ?? null) === id);
    return { id, name, clients: mine.length, open: sum(mine.map((c) => c.openJobs)), waiting: sum(mine.map((c) => c.requestsWaiting)) };
  };
  const rows = HR_OFFICERS.filter((h) => !q.hrId || h.id === q.hrId).map((h) => mk(h.id, h.name));
  const none = q.hrId ? null : mk(null, "No HR assigned");
  if (none && none.clients > 0) rows.push(none);
  const out = rows.sort((a, b) => b.open + b.waiting - (a.open + a.waiting) || a.name.localeCompare(b.name));
  return {
    ...base("hr-workload", "HR workload", "now"),
    chartTitle: "Open work by HR officer",
    chart: { kind: "bars", unit: "open vacancies and waiting requests", rows: out.map((r) => ({ key: r.id ?? "none", label: r.name, value: r.open + r.waiting })) },
    summary: `Open vacancies plus waiting requests for each of ${HR_OFFICERS.length} HR officers.`,
    kpis: [{ key: "h", label: "HR officers", value: String(HR_OFFICERS.length) }, { key: "u", label: "Clients without HR", value: String(none?.clients ?? mk(null, "").clients) }, { key: "o", label: "Open vacancies", value: String(sum(clients.map((c) => c.openJobs))) }],
    columns: [{ key: "h", label: "HR officer" }, { key: "c", label: "Clients", align: "right" }, { key: "o", label: "Open vacancies", align: "right" }, { key: "w", label: "Waiting requests", align: "right" }],
    rows: out.map((r) => ({ id: r.id ?? "none", href: r.id ? `/admin/ops/assignments?hr=${r.id}` : "/admin/ops/assignments?show=unassigned", cells: { h: r.name, c: String(r.clients), o: String(r.open), w: String(r.waiting) } })),
    total: out.length,
    workspaceEmpty: clients.length === 0,
  };
}

async function clientActivity(q: OpsReportQuery): Promise<OpsReportData> {
  const blocks = await collect(q, true);
  const rows = blocks.map((b) => ({ b, n: b.wins[0].days.length })).sort((x, y) => y.n - x.n || x.b.name.localeCompare(y.b.name));
  return {
    ...base("client-activity", "Client activity", "range"),
    chartTitle: "Placements by client",
    chart: { kind: "bars", unit: "placements", rows: rows.map(({ b, n }) => ({ key: b.id, label: b.name, value: n })) },
    summary: `Placements in this period for each of ${rows.length} clients.`,
    kpis: [{ key: "c", label: "Clients", value: String(rows.length) }, { key: "p", label: "Placements", value: String(sum(rows.map((r) => r.n))) }, { key: "u", label: "Clients without HR", value: String(blocks.filter((b) => !b.hr).length) }],
    columns: [{ key: "c", label: "Client" }, { key: "h", label: "HR officer" }, { key: "o", label: "Open vacancies", align: "right" }, { key: "w", label: "Waiting requests", align: "right" }, { key: "n", label: "Placements", align: "right" }],
    rows: rows.map(({ b, n }): OpsRow => ({ id: b.id, href: `/admin/ops/assignments/${b.id}`, cells: { c: b.name, h: b.hr?.name ?? "No HR assigned", o: String(b.openJobs), w: String(b.requestsWaiting), n: String(n) } })),
    total: rows.length,
    workspaceEmpty: rows.length === 0 && !q.clientId && !q.hrId,
  };
}

const TITLES: Record<OpsReportId, [string, string]> = {
  placements: ["Placements", "Applicants placed with clients, over time, by client or by HR officer."],
  funnel: ["Recruitment funnel", "How many applicants reach each stage, from applied to placed."],
  "time-to-place": ["Time to place", "Average days from application to placed."],
  "hr-workload": ["HR workload", "Clients, open vacancies and waiting requests for each HR officer."],
  "client-activity": ["Client activity", "Open work and placements for each client."],
};

const daysBack = (n: number) => iso(addDays(new Date(), -n));

export const mockOpsReportsAdapter: OpsReportsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listReports() {
    const mode = await gate();
    const entry = (id: OpsReportId, headline: OpsReportHubEntry["headline"]): OpsReportHubEntry => ({ id, title: TITLES[id][0], description: TITLES[id][1], headline });
    if (mode === "empty") return (Object.keys(TITLES) as OpsReportId[]).map((id) => entry(id, null));
    const range = { from: daysBack(89), to: iso(new Date()), clientId: "", hrId: "" };
    const [blocks, counts, g, hrMap] = await Promise.all([collect(range, true), funnelCounts(range), glanceNow(), currentHrByClient()]);
    const days = allDays(blocks);
    const noHr = g.byClient.filter((c) => !hrMap.get(c.id)).length;
    return [
      entry("placements", { value: String(days.length), label: "placed, last 90 days" }),
      entry("funnel", { value: `${counts[4]} of ${counts[0]}`, label: "applicants placed" }),
      entry("time-to-place", { value: str(avg(days)), label: "average days" }),
      entry("hr-workload", noHr ? { value: String(noHr), label: noHr === 1 ? "client has no HR" : "clients have no HR", tone: "bad" } : { value: String(HR_OFFICERS.length), label: "HR officers" }),
      entry("client-activity", { value: String(g.byClient.length), label: "clients" }),
    ];
  },

  async getFacets(): Promise<OpsReportFacets> {
    await gate();
    const g = await glanceNow();
    return { clients: g.byClient.map((c) => ({ id: c.id, name: c.name })), hr: HR_OFFICERS.map((h) => ({ id: h.id, name: h.name })) };
  },

  async getReport(q: OpsReportQuery): Promise<OpsReportData> {
    const mode = await gate();
    if (mode === "empty") return emptyData(q, TITLES[q.report][0], TITLES[q.report][0], q.report === "hr-workload" ? "now" : "range");
    switch (q.report) {
      case "placements":
        return placements(q);
      case "funnel":
        return funnel(q);
      case "time-to-place":
        return timeToPlace(q);
      case "hr-workload":
        return hrWorkload(q);
      default:
        return clientActivity(q);
    }
  },
};

