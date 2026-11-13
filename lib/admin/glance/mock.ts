/**
 * DEV FIXTURE for Business at a glance. FICTIONAL. It does not hold its own
 * numbers: everything is derived from the other Admin mocks through their
 * SERVICES (reports, clients, client requests) plus the shared client/outlet/
 * staff fixture lists, the way a server would aggregate. COUNTS ONLY.
 * Known mock gaps (not decided here): the Reports fixture knows a third demo
 * client ("Demo Grill") that the Clients fixture does not, so it is left out;
 * the client-requests fixture uses its own client ids, so requests are matched
 * to clients by NAME. Replace with a Supabase adapter implementing GlanceAdapter.
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { listRequests } from "../client-requests/service";
import { listClients } from "../clients/service";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getReport } from "../reports/service";
import { MOCK_CLIENTS, MOCK_OUTLETS, scopedStaffRows } from "../staff/mock";
import type { GlanceAdapter } from "./adapter";
import type { GlanceClientRow, GlanceData, GlanceDelta, GlanceHrRow, GlanceScope, GlanceTile, Tone, Workload } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(notify);

/* DEV preview scope store */
let previewScope: GlanceScope = "hr";
const scopeListeners = new Set<() => void>();
export const getPreviewScope = () => previewScope;
export const setPreviewScope = (s: GlanceScope) => {
  if (s === previewScope) return;
  previewScope = s;
  scopeListeners.forEach((l) => l());
};
export const subscribePreviewScope = (cb: () => void) => {
  scopeListeners.add(cb);
  return () => scopeListeners.delete(cb);
};

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

/* ---------- date helpers ---------- */
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Month `back` months ago: first day and last day (today for the current month). */
function monthRange(back: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const last = back === 0 ? now : new Date(now.getFullYear(), now.getMonth() - back + 1, 0);
  return { from: isoDay(first), to: isoDay(last), label: first.toLocaleDateString("en-GB", { month: "short" }), title: first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
}
const yearAgo = () => isoDay(new Date(Date.now() - 365 * 86_400_000));

/** Mock only: the Clients fixture gives no status for an out-of-scope client, so "onboarding" is a sample value. */
const STATUS: Record<string, { label: string; tone: Tone }> = { active: { label: "Active", tone: "ok" }, onboarding: { label: "Onboarding", tone: "warn" }, invited: { label: "Invited", tone: "info" }, inactive: { label: "Inactive", tone: "mute" } };

const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);

function delta(now: number, before: number, unit: string, higherIsGood: boolean | null): GlanceDelta {
  if (now === before) return { dir: "same", text: "Same as last month", good: null };
  const up = now > before;
  const diff = Math.abs(now - before);
  return { dir: up ? "up" : "down", text: `${diff}${unit ? ` ${unit}` : ""} ${up ? "more" : "fewer"} than last month`, good: higherIsGood === null ? null : up === higherIsGood };
}

/** Relative rule (needs Beeliv confirmation): compared with the average officer's load. */
function workloadOf(score: number, mean: number): Workload {
  if (mean === 0) return "Light";
  const r = score / mean;
  return r < 0.7 ? "Light" : r > 1.3 ? "Heavy" : "Balanced";
}

async function build(scope: GlanceScope): Promise<GlanceData> {
  const clients = MOCK_CLIENTS.filter((c) => scope === "all" || c.inScope);
  const months = [5, 4, 3, 2, 1, 0].map(monthRange);

  const [perClient, reqNew, reqProg, clientsPage] = await Promise.all([
    Promise.all(
      clients.map(async (c) => {
        const [placed, pipe] = await Promise.all([
          Promise.all(months.map((m) => getReport({ report: "placement", from: m.from, to: m.to, clientId: c.id, vacancyId: "" }))),
          getReport({ report: "pipeline", from: yearAgo(), to: isoDay(new Date()), clientId: c.id, vacancyId: "" }),
        ]);
        return { c, placed, pipe };
      }),
    ),
    listRequests({ search: "", tab: "new", clientId: "", limit: 200 }),
    listRequests({ search: "", tab: "in-progress", clientId: "", limit: 200 }),
    listClients({ search: "", status: "", sort: "name", limit: 200 }),
  ]);

  const names = new Set(clients.map((c) => c.name));
  const openReqs = [...reqNew.rows, ...reqProg.rows].filter((r) => names.has(r.client));
  const waiting = openReqs.filter((r) => r.status === "new" || r.status === "under-review");
  const overdue = openReqs.filter((r) => r.needsAttention);
  const staff = scopedStaffRows().filter((s) => s.status !== "suspended" && clients.some((c) => c.id === s.clientId));

  const monthTotals = months.map((_, i) => sum(perClient.map((p) => p.placed[i].rows.length)));
  const daysOf = (i: number) => perClient.flatMap((p) => p.placed[i].rows.map((r) => Number(r.cells.d)));
  const avg = (a: number[]) => (a.length ? Math.round(sum(a) / a.length) : null);
  const dNow = avg(daysOf(5));
  const dPrev = avg(daysOf(4));

  const hrOf = (id: string) => MOCK_OUTLETS.find((o) => o.clientId === id)?.hr.primary ?? null;
  const byClient: GlanceClientRow[] = perClient.map(({ c, placed }) => {
    const row = clientsPage.rows.find((r) => r.id === c.id);
    const st = STATUS[row?.status ?? "onboarding"];
    return {
      id: c.id,
      name: c.name,
      openJobs: row?.openVacancies ?? 0,
      requestsWaiting: waiting.filter((r) => r.client === c.name).length,
      placementsMonth: placed[5].rows.length,
      hr: row ? (row.assignedHr.primary?.name ?? null) : (hrOf(c.id)?.name ?? null),
      statusLabel: st.label,
      statusTone: st.tone,
      href: `/admin/clients/${c.id}`,
    };
  });

  const openJobs = sum(byClient.map((r) => r.openJobs));
  const funnel = ["Applied", "Shortlisted", "Interviewed", "Offered", "Placed"].map((s) => ({
    key: s,
    label: s,
    value: sum(
      perClient.map((p) => {
        const sp = p.pipe.charts.find((x) => x.id === "funnel")?.spec;
        return sp && sp.kind === "bars" ? (sp.rows.find((r) => r.label === s)?.value ?? 0) : 0;
      }),
    ),
  }));

  const tiles: GlanceTile[] = [
    { key: "placements", icon: "placements", label: "Placements this month", value: String(monthTotals[5]), delta: delta(monthTotals[5], monthTotals[4], "", true), href: "/admin/recruitment/applicants?stage=approved-placed" },
    { key: "days", icon: "days", label: "Average days to place", value: dNow === null ? "None" : String(dNow), sub: "from application to placed", delta: dNow !== null && dPrev !== null ? delta(dNow, dPrev, "days", false) : null, href: "/admin/reports/placement" },
    { key: "jobs", icon: "jobs", label: "Open jobs", value: String(openJobs), delta: null, href: "/admin/recruitment/vacancies?tab=open" },
    { key: "requests", icon: "requests", label: "Open client requests", value: String(openReqs.length), sub: overdue.length ? `${overdue.length} waiting too long` : "None waiting too long", subTone: overdue.length ? "bad" : undefined, delta: null, href: "/admin/clients/requests?tab=new" },
    { key: "waiting", icon: "waiting", label: "Clients waiting on us", value: String(new Set(waiting.map((r) => r.client)).size), sub: "request not yet picked up", delta: null, href: "/admin/clients/requests?tab=new" },
    { key: "staff", icon: "staff", label: "Active staff placed", value: String(staff.length), delta: null, href: "/admin/people?view=staff" },
  ];

  const charts = [
    {
      id: "per-month", title: "Placements per month", subtitle: "Last 6 months",
      spec: { kind: "trend" as const, unit: "placements", points: months.map((m, i) => ({ id: m.from, label: m.label, sub: "", title: m.title, value: monthTotals[i] })) },
      summary: "Placements made each month over the last six months.",
    },
    { id: "funnel", title: "Applicant funnel", subtitle: "Last 12 months", spec: { kind: "bars" as const, rows: funnel }, summary: "Applicants who reached each stage, from applied to placed." },
  ];

  let byHr: GlanceHrRow[] | null = null;
  if (scope === "all") {
    const hrs = new Map<string, { id: string; name: string }>();
    MOCK_OUTLETS.forEach((o) => o.hr.primary && hrs.set(o.hr.primary.id, o.hr.primary));
    const raw = [...hrs.values()].map((h) => {
      const mine = byClient.filter((r) => r.hr === h.name);
      return { id: h.id, name: h.name, clients: mine.length, openJobs: sum(mine.map((r) => r.openJobs)), requestsWaiting: sum(mine.map((r) => r.requestsWaiting)), placementsMonth: sum(mine.map((r) => r.placementsMonth)) };
    });
    const scores = raw.map((r) => r.clients + r.openJobs + r.requestsWaiting);
    const mean = scores.length ? sum(scores) / scores.length : 0;
    byHr = raw.map((r, i) => ({ ...r, workload: workloadOf(scores[i], mean) })).sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    scope,
    generatedAt: new Date().toISOString(),
    tiles,
    charts,
    byClient,
    byHr,
    notShown: ["New enquiries and how many became clients: enquiries go to Operations and no enquiry data is available to this screen yet."],
    workspaceEmpty: clients.length === 0,
  };
}

export const mockGlanceAdapter: GlanceAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async getGlance(scope) {
    const mode = await gate();
    if (mode === "empty") return { scope, generatedAt: new Date().toISOString(), tiles: [], charts: [], byClient: [], byHr: null, notShown: [], workspaceEmpty: true };
    return build(scope);
  },
};
