/**
 * DEV FIXTURE for Reports. Everything is FICTIONAL and generated
 * deterministically (a fixed pseudo-random sequence) from a small set of
 * vacancies and applications, then aggregated here the way a server would.
 * Counts are plain counts; no rate, target or SLA rule is invented. Replace with
 * a Supabase adapter implementing ReportsAdapter.
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { ReportsAdapter } from "./adapter";
import type { ChartSpec, ReportChart, ReportColumn, ReportData, ReportEntry, ReportFacets, ReportId, ReportQuery, ReportRow, Tone } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(300);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
  { id: "c-demo-grill", name: "Demo Grill Port Harcourt" },
];
type Vac = { id: string; name: string; clientId: string; outlet: string; openedAgo: number; openings: number; status: "Open" | "Filled" | "Closed" | "Paused" };
const VACS: Vac[] = [
  { id: "v-waiter", name: "Waiter / Waitress", clientId: "c-demo-hotel", outlet: "Main building", openedAgo: 110, openings: 4, status: "Open" },
  { id: "v-chef", name: "Commis Chef", clientId: "c-demo-lounge", outlet: "Victoria Island", openedAgo: 95, openings: 2, status: "Open" },
  { id: "v-bar", name: "Bar Attendant", clientId: "c-demo-lounge", outlet: "Victoria Island", openedAgo: 70, openings: 2, status: "Filled" },
  { id: "v-desk", name: "Front Desk Officer", clientId: "c-demo-hotel", outlet: "Main building", openedAgo: 55, openings: 1, status: "Open" },
  { id: "v-floor", name: "Floor Supervisor", clientId: "c-demo-hotel", outlet: "Main building", openedAgo: 130, openings: 1, status: "Filled" },
  { id: "v-host", name: "Host / Hostess", clientId: "c-demo-grill", outlet: "Town centre", openedAgo: 40, openings: 2, status: "Open" },
  { id: "v-cook", name: "Line Cook", clientId: "c-demo-grill", outlet: "Town centre", openedAgo: 25, openings: 3, status: "Paused" },
  { id: "v-clean", name: "Housekeeping Attendant", clientId: "c-demo-hotel", outlet: "Main building", openedAgo: 150, openings: 2, status: "Closed" },
];
const NAMES = ["Ada", "Tunde", "Chidi", "Bisi", "Ngozi", "Emeka", "Zainab", "Yusuf", "Amaka", "Segun", "Halima", "Ifeanyi", "Folake", "Gbenga", "Rukky", "Obinna", "Tola", "Maryam", "Dayo", "Kemi", "Uche", "Lara", "Musa", "Peace", "Sade", "Wale"];
const STAGES = ["Applied", "Shortlisted", "Interviewed", "Offered", "Placed"] as const;
const IV_STAGES = ["HR Screening", "Beeliv Interview", "Client Interview", "Practical Assessment"];
type Outcome = "In progress" | "Placed" | "Rejected" | "Withdrawn";
type App = { id: string; ai: number; applicant: string; vac: Vac; appliedAgo: number; stage: number; outcome: Outcome; ivOutcome: "Passed" | "On hold" | "Failed" | "No show" | "Scheduled" | null; ivStage: string; ivAgo: number; placedAgo: number | null };

let seedv = 7;
const rnd = () => {
  seedv = (seedv * 1103515245 + 12345) & 0x7fffffff;
  return seedv / 0x7fffffff;
};
const APPS: App[] = (() => {
  seedv = 7;
  const out: App[] = [];
  let n = 0;
  for (const v of VACS) {
    const count = 7 + Math.floor(rnd() * 5);
    for (let k = 0; k < count; k++) {
      const ai = n % NAMES.length;
      n++;
      const appliedAgo = Math.max(1, Math.floor(v.openedAgo - rnd() * v.openedAgo * 0.9));
      const stage = Math.min(4, Math.floor(rnd() * 5.4));
      const r = rnd();
      const outcome: Outcome = stage === 4 ? "Placed" : r < 0.22 ? "Rejected" : r < 0.3 ? "Withdrawn" : "In progress";
      const ivr = rnd();
      const ivOutcome = stage >= 2 || (outcome === "Rejected" && r < 0.12) ? (stage >= 3 ? "Passed" : ivr < 0.45 ? "Passed" : ivr < 0.6 ? "On hold" : ivr < 0.8 ? "Failed" : ivr < 0.9 ? "No show" : "Scheduled") : null;
      const ivAgo = Math.max(0, appliedAgo - 6 - Math.floor(rnd() * 5));
      out.push({
        id: `app-${n}`, ai, applicant: `${NAMES[ai]} Sample`, vac: v, appliedAgo, stage, outcome, ivOutcome: ivOutcome as App["ivOutcome"], ivStage: IV_STAGES[Math.floor(rnd() * IV_STAGES.length)], ivAgo,
        placedAgo: stage === 4 ? Math.max(0, appliedAgo - 12 - Math.floor(rnd() * 14)) : null,
      });
    }
  }
  return out;
})();

/* ---------- date helpers ---------- */
const DAY = 86_400_000;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ago = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return isoDay(new Date(d.getTime() - n * DAY));
};
const show = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");
const weekStart = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
};
const wk = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const ENTRIES: ReportEntry[] = [
  { id: "vacancy", title: "Vacancy report", description: "Vacancies opened, their status, and applications through to placements.", availability: "available", group: "recruitment", report: "vacancy" },
  { id: "pipeline", title: "Applicant pipeline", description: "Where applicants are, from application to placement.", availability: "available", group: "recruitment", report: "pipeline" },
  { id: "interview", title: "Interview report", description: "Interviews held, by stage and outcome.", availability: "available", group: "recruitment", report: "interview" },
  { id: "placement", title: "Placement report", description: "Applicants placed with clients and outlets.", availability: "available", group: "recruitment", report: "placement" },
  { id: "history", title: "Recruitment history", description: "Every recruitment event in the period, with who did it.", availability: "available", group: "recruitment", report: "history" },
  { id: "workforce", title: "Workforce and attendance", description: "Attendance, scheduling and leave reporting.", availability: "later", group: "workforce" },
  { id: "compliance", title: "Compliance", description: "Documentation and compliance reporting.", availability: "later", group: "compliance" },
];

const FACETS: ReportFacets = { clients: CLIENTS, vacancies: VACS.map((v) => ({ id: v.id, name: v.name, clientId: v.clientId })) };

const cname = (id: string) => CLIENTS.find((c) => c.id === id)?.name ?? "";
const applicantHref = (a: App) => `/admin/recruitment/applicants/a-${String(a.ai + 1).padStart(3, "0")}`;

function build(q: ReportQuery): ReportData {
  const inRange = (iso: string) => iso >= q.from && iso <= q.to;
  const scope = (a: App) => (!q.clientId || a.vac.clientId === q.clientId) && (!q.vacancyId || a.vac.id === q.vacancyId);
  const apps = APPS.filter(scope);
  const vacs = VACS.filter((v) => (!q.clientId || v.clientId === q.clientId) && (!q.vacancyId || v.id === q.vacancyId));
  const gen = new Date().toISOString();
  const weeks = (items: { iso: string }[]) => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(weekStart(i.iso), (m.get(weekStart(i.iso)) ?? 0) + 1));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  };
  const trendOf = (items: { iso: string }[], unit: string): ChartSpec => ({
    kind: "trend", unit,
    points: weeks(items).map(([w, v]) => ({ id: w, label: wk(w), sub: "week of", title: `Week of ${show(w)}`, value: v })),
  });
  const base = { report: q.report, generatedAt: gen, workspaceEmpty: false };
  const chart = (id: string, title: string, spec: ChartSpec, summary: string, subtitle?: string): ReportChart => ({ id, title, subtitle, spec, summary });
  const segs = (pairs: [string, string, number, Tone][]) => pairs.map(([key, label, value, tone]) => ({ key, label, value, tone }));

  if (q.report === "vacancy") {
    const rows = vacs.filter((v) => inRange(ago(v.openedAgo)));
    const perVac = (v: Vac) => APPS.filter((a) => a.vac.id === v.id && inRange(ago(a.appliedAgo)));
    const status = (s: Vac["status"]) => rows.filter((v) => v.status === s).length;
    const applied = rows.reduce((n, v) => n + perVac(v).length, 0);
    const placed = rows.reduce((n, v) => n + perVac(v).filter((a) => a.stage === 4).length, 0);
    const cols: ReportColumn[] = [{ key: "v", label: "Vacancy" }, { key: "c", label: "Client and outlet" }, { key: "s", label: "Status" }, { key: "o", label: "Opened" }, { key: "n", label: "Openings", align: "right" }, { key: "a", label: "Applied", align: "right" }, { key: "sl", label: "Shortlisted", align: "right" }, { key: "p", label: "Placed", align: "right" }];
    const trs: ReportRow[] = rows.map((v) => ({ id: v.id, href: `/admin/recruitment/vacancies`, cells: { v: v.name, c: `${cname(v.clientId)}, ${v.outlet}`, s: v.status, o: show(ago(v.openedAgo)), n: String(v.openings), a: String(perVac(v).length), sl: String(perVac(v).filter((a) => a.stage >= 1).length), p: String(perVac(v).filter((a) => a.stage === 4).length) } }));
    return {
      ...base, title: "Vacancy report", workspaceEmpty: vacs.length === 0,
      kpis: [{ key: "n", label: "Vacancies opened", value: String(rows.length) }, { key: "o", label: "Open now", value: String(status("Open")) }, { key: "f", label: "Filled", value: String(status("Filled")) }, { key: "a", label: "Applications", value: String(applied), sub: `${placed} placed` }],
      charts: [
        chart("by-vac", "Applications by vacancy", { kind: "bars", rows: rows.map((v) => ({ key: v.id, label: v.name, value: perVac(v).length })).sort((a, b) => b.value - a.value) }, `Applications for each of ${rows.length} vacancies.`),
        chart("by-status", "Vacancies by status", { kind: "donut", centerValue: String(rows.length), centerLabel: "vacancies", segments: segs([["open", "Open", status("Open"), "ok"], ["filled", "Filled", status("Filled"), "info"], ["paused", "Paused", status("Paused"), "warn"], ["closed", "Closed", status("Closed"), "mute"]]) }, `${rows.length} vacancies by status.`),
      ],
      columns: cols, rows: trs, total: trs.length,
    };
  }

  if (q.report === "pipeline") {
    const rows = apps.filter((a) => inRange(ago(a.appliedAgo)));
    const reached = (s: number) => rows.filter((a) => a.stage >= s).length;
    const out = (o: Outcome) => rows.filter((a) => a.outcome === o).length;
    const cols: ReportColumn[] = [{ key: "a", label: "Applicant" }, { key: "v", label: "Vacancy" }, { key: "c", label: "Client" }, { key: "d", label: "Applied" }, { key: "s", label: "Furthest stage" }, { key: "o", label: "Outcome" }];
    return {
      ...base, title: "Applicant pipeline", workspaceEmpty: APPS.length === 0,
      kpis: [{ key: "a", label: "Applications", value: String(rows.length) }, { key: "s", label: "Shortlisted", value: String(reached(1)) }, { key: "i", label: "Interviewed", value: String(reached(2)) }, { key: "p", label: "Placed", value: String(reached(4)) }],
      charts: [
        chart("funnel", "Applicants by furthest stage", { kind: "bars", rows: STAGES.map((s, i) => ({ key: s, label: s, value: reached(i) })) }, "Applicants who reached each stage of the pipeline."),
        chart("outcome", "Outcome", { kind: "donut", centerValue: String(rows.length), centerLabel: "applications", segments: segs([["prog", "In progress", out("In progress"), "plum"], ["placed", "Placed", out("Placed"), "ok"], ["rej", "Rejected", out("Rejected"), "bad"], ["wd", "Withdrawn", out("Withdrawn"), "mute"]]) }, "Applications by outcome."),
        chart("trend", "Applications per week", trendOf(rows.map((a) => ({ iso: ago(a.appliedAgo) })), "applications"), "Applications received each week."),
      ],
      columns: cols, total: rows.length,
      rows: rows.sort((a, b) => a.appliedAgo - b.appliedAgo).map((a) => ({ id: a.id, href: applicantHref(a), cells: { a: a.applicant, v: a.vac.name, c: cname(a.vac.clientId), d: show(ago(a.appliedAgo)), s: STAGES[a.stage], o: a.outcome } })),
    };
  }

  if (q.report === "interview") {
    const rows = apps.filter((a) => a.ivOutcome && inRange(ago(a.ivAgo)));
    const o = (x: string) => rows.filter((a) => a.ivOutcome === x).length;
    const byWeek = new Map<string, Record<string, number>>();
    rows.forEach((a) => {
      const w = weekStart(ago(a.ivAgo));
      const rec = byWeek.get(w) ?? {};
      rec[a.ivOutcome!] = (rec[a.ivOutcome!] ?? 0) + 1;
      byWeek.set(w, rec);
    });
    const cols: ReportColumn[] = [{ key: "a", label: "Applicant" }, { key: "v", label: "Vacancy" }, { key: "s", label: "Stage" }, { key: "d", label: "Date" }, { key: "o", label: "Outcome" }];
    return {
      ...base, title: "Interview report", workspaceEmpty: APPS.every((a) => !a.ivOutcome),
      kpis: [{ key: "n", label: "Interviews", value: String(rows.length) }, { key: "p", label: "Passed", value: String(o("Passed")) }, { key: "f", label: "Failed", value: String(o("Failed")) }, { key: "ns", label: "No shows", value: String(o("No show")) }],
      charts: [
        chart("weekly", "Interviews per week by outcome", { kind: "stacked", points: [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, rec]) => ({ id: w, label: wk(w), sub: "week of", title: `Week of ${show(w)}`, segments: segs([["Passed", "Passed", rec.Passed ?? 0, "ok"], ["On hold", "On hold", rec["On hold"] ?? 0, "warn"], ["Failed", "Failed", rec.Failed ?? 0, "bad"], ["No show", "No show", rec["No show"] ?? 0, "mute"], ["Scheduled", "Scheduled", rec.Scheduled ?? 0, "info"]]) })) }, "Interviews each week split by outcome."),
        chart("stage", "Interviews by stage", { kind: "bars", rows: IV_STAGES.map((s) => ({ key: s, label: s, value: rows.filter((a) => a.ivStage === s).length })) }, "Interviews by stage."),
      ],
      columns: cols, total: rows.length,
      rows: rows.sort((a, b) => a.ivAgo - b.ivAgo).map((a) => ({ id: a.id, href: applicantHref(a), cells: { a: a.applicant, v: a.vac.name, s: a.ivStage, d: show(ago(a.ivAgo)), o: a.ivOutcome! } })),
    };
  }

  if (q.report === "placement") {
    const rows = apps.filter((a) => a.placedAgo !== null && inRange(ago(a.placedAgo)));
    const days = rows.map((a) => a.appliedAgo - (a.placedAgo ?? 0));
    const avg = rows.length ? Math.round(days.reduce((n, d) => n + d, 0) / rows.length) : 0;
    const byClient = CLIENTS.map((c) => ({ key: c.id, label: c.name, value: rows.filter((a) => a.vac.clientId === c.id).length })).filter((r) => !q.clientId || r.key === q.clientId);
    const cols: ReportColumn[] = [{ key: "a", label: "Applicant" }, { key: "c", label: "Client and outlet" }, { key: "r", label: "Role" }, { key: "p", label: "Placed" }, { key: "d", label: "Days from application", align: "right" }];
    return {
      ...base, title: "Placement report", workspaceEmpty: APPS.every((a) => a.placedAgo === null),
      kpis: [{ key: "n", label: "Placements", value: String(rows.length) }, { key: "c", label: "Clients served", value: String(new Set(rows.map((a) => a.vac.clientId)).size) }, { key: "d", label: "Average days to place", value: rows.length ? String(avg) : "None", sub: "from application" }],
      charts: [
        chart("by-client", "Placements by client", { kind: "bars", rows: byClient.sort((a, b) => b.value - a.value) }, "Placements for each client."),
        chart("trend", "Placements per week", trendOf(rows.map((a) => ({ iso: ago(a.placedAgo!) })), "placements"), "Placements made each week."),
      ],
      columns: cols, total: rows.length,
      rows: rows.sort((a, b) => a.placedAgo! - b.placedAgo!).map((a) => ({ id: a.id, href: applicantHref(a), cells: { a: a.applicant, c: `${cname(a.vac.clientId)}, ${a.vac.outlet}`, r: a.vac.name, p: show(ago(a.placedAgo!)), d: String(a.appliedAgo - a.placedAgo!) } })),
    };
  }

  /* history */
  type Ev = { id: string; ago: number; app: App; type: string; actor: string };
  const evs: Ev[] = [];
  apps.forEach((a) => {
    evs.push({ id: `${a.id}-e0`, ago: a.appliedAgo, app: a, type: "Application received", actor: "Applicant" });
    if (a.stage >= 1) evs.push({ id: `${a.id}-e1`, ago: Math.max(0, a.appliedAgo - 3), app: a, type: "Shortlisted", actor: "Funke Sample" });
    if (a.ivOutcome) evs.push({ id: `${a.id}-e2`, ago: a.ivAgo, app: a, type: `Interview: ${a.ivOutcome}`, actor: "Kelechi Sample" });
    if (a.stage >= 3) evs.push({ id: `${a.id}-e3`, ago: Math.max(0, a.ivAgo - 3), app: a, type: "Offer sent", actor: "Funke Sample" });
    if (a.placedAgo !== null) evs.push({ id: `${a.id}-e4`, ago: a.placedAgo, app: a, type: "Placed", actor: "Adaeze Sample" });
    if (a.outcome === "Rejected") evs.push({ id: `${a.id}-e5`, ago: Math.max(0, a.appliedAgo - 5), app: a, type: "Rejected", actor: "Funke Sample" });
  });
  const rows = evs.filter((e) => inRange(ago(e.ago)));
  const types = [...new Set(rows.map((e) => e.type.split(":")[0]))];
  const cols: ReportColumn[] = [{ key: "w", label: "When" }, { key: "a", label: "Applicant" }, { key: "v", label: "Vacancy" }, { key: "e", label: "Event" }, { key: "by", label: "By" }];
  return {
    ...base, title: "Recruitment history", workspaceEmpty: APPS.length === 0,
    kpis: [{ key: "e", label: "Events", value: String(rows.length) }, { key: "a", label: "Applicants involved", value: String(new Set(rows.map((e) => e.app.id)).size) }, { key: "v", label: "Vacancies involved", value: String(new Set(rows.map((e) => e.app.vac.id)).size) }],
    charts: [
      chart("types", "Events by type", { kind: "bars", rows: types.map((t) => ({ key: t, label: t, value: rows.filter((e) => e.type.split(":")[0] === t).length })).sort((a, b) => b.value - a.value) }, "Recruitment events by type."),
      chart("trend", "Events per week", trendOf(rows.map((e) => ({ iso: ago(e.ago) })), "events"), "Recruitment events each week."),
    ],
    columns: cols, total: rows.length,
    rows: rows.sort((a, b) => a.ago - b.ago).map((e) => ({ id: e.id, href: applicantHref(e.app), cells: { w: show(ago(e.ago)), a: e.app.applicant, v: e.app.vac.name, e: e.type, by: e.actor } })),
  };
}

export const mockReportsAdapter: ReportsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async listReports() {
    const mode = await gate();
    return mode === "empty" ? [] : ENTRIES;
  },
  async getFacets() {
    await gate();
    return FACETS;
  },
  async getReport(q) {
    const mode = await gate();
    if (mode === "empty") return { report: q.report as ReportId, title: "", kpis: [], charts: [], columns: [], rows: [], total: 0, generatedAt: new Date().toISOString(), workspaceEmpty: true };
    return build(q);
  },
};
