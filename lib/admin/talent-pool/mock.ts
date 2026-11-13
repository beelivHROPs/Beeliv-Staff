/**
 * DEV FIXTURE for the Talent Pool. Everything is FICTIONAL ("Sample" people).
 * The Overview's Talent Pool summary is derived from the same array
 * (talentPoolSummary) so the two always agree. Replace with a Supabase
 * adapter implementing TalentPoolAdapter; no screen changes.
 */
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { cmpIso, cmpText } from "../sort";
import { poolMoves, removeMove, subscribePool, type PoolMove } from "../pool-store";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { textInScope } from "../scope";
import type { TalentPoolSummary } from "../types";
import type { TalentPoolAdapter } from "./adapter";
import type { LastContactFilter, OpenVacancyOption, PoolStatus, RetainedAs, TalentPoolPage, TalentPoolQuery, TalentPoolRow } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));
subscribePool(() => listeners.forEach((l) => l("reset")));

const VACANCIES: OpenVacancyOption[] = [
  { id: "v-waiter", title: "Waiter / Waitress", department: "Floor / Service", outlet: "Demo Hotel Abuja, Main building" },
  { id: "v-chef", title: "Commis Chef", department: "Kitchen", outlet: "Demo Lounge Lagos, Victoria Island" },
  { id: "v-bar", title: "Bar Attendant", department: "Bar", outlet: "Demo Lounge Lagos, Victoria Island" },
  { id: "v-desk", title: "Front Desk Officer", department: "Management / Operations", outlet: "Demo Hotel Abuja, Main building" },
  { id: "v-floor", title: "Floor Supervisor", department: "Management / Operations", outlet: "Demo Hotel Abuja, Main building" },
];
const vac = (id: string) => VACANCIES.find((v) => v.id === id) ?? VACANCIES[0];

/** name, location, source vacancy id, other roles applied for, retainedAs, status, skills, days since contact (-1 never) */
const SEED: [string, string, string, string[], RetainedAs, PoolStatus, string[], number][] = [
  ["Obinna Sample", "Abuja", "v-chef", [], "not-selected", "suitable", ["Grill", "Food safety", "Menu prep"], 12],
  ["Sade Sample", "Lagos", "v-waiter", ["Host / Hostess"], "shortlisted-unplaced", "suitable", ["Fine dining", "POS", "Upselling"], 6],
  ["Kunle Sample", "Abuja", "v-bar", [], "withdrawn", "retained", ["Cocktails", "Inventory"], 75],
  ["Ngozi Sample", "Port Harcourt", "v-desk", ["Floor Supervisor"], "shortlisted-unplaced", "needs-follow-up", ["Reception", "Reservations", "Customer care"], 41],
  ["Emeka Sample", "Lagos", "v-chef", [], "not-selected", "needs-follow-up", ["Pastry", "Food safety"], 120],
  ["Fatima Sample", "Abuja", "v-waiter", [], "not-selected", "suitable", ["Banquet service", "POS"], 20],
  ["Yemi Sample", "Lagos", "v-floor", ["Waiter / Waitress"], "shortlisted-unplaced", "suitable", ["Team lead", "Rostering", "Fine dining"], 9],
  ["Zainab Sample", "Kano", "v-desk", [], "withdrawn", "retained", ["Reception", "Customer care"], -1],
  ["Ibrahim Sample", "Abuja", "v-bar", [], "not-selected", "needs-follow-up", ["Cocktails", "Customer care"], 95],
  ["Amaka Sample", "Lagos", "v-waiter", [], "not-selected", "retained", ["POS", "Upselling"], 33],
  ["Segun Sample", "Abuja", "v-chef", ["Bar Attendant"], "shortlisted-unplaced", "suitable", ["Grill", "Menu prep", "Inventory"], 4],
  ["Hadiza Sample", "Abuja", "v-floor", [], "not-selected", "needs-follow-up", ["Team lead", "Banquet service"], 60],
  ["Tola Sample", "Lagos", "v-desk", [], "withdrawn", "retained", ["Reservations", "POS"], 150],
  ["Rita Sample", "Port Harcourt", "v-bar", [], "not-selected", "suitable", ["Cocktails", "Inventory", "Upselling"], 15],
];

let pool: TalentPoolRow[] = SEED.map(([name, location, vId, others, retainedAs, status, skills, ago], i) => ({
  id: `tp-${i + 1}`,
  applicantId: `a-uuid-tp-${i + 1}`,
  name,
  location,
  department: vac(vId).department,
  appliedFor: [vac(vId).title, ...others],
  sourceVacancy: { id: vId, title: vac(vId).title },
  retainedAs,
  skills,
  lastContactAt: ago < 0 ? null : isoOffset(-ago, 11, 0),
  status,
}));

const moveToRow = (m: PoolMove): TalentPoolRow => ({
  id: `tp-m-${m.applicantId}`,
  applicantId: m.applicantId,
  name: m.name,
  location: m.location,
  department: m.department,
  appliedFor: [m.vacancyTitle],
  sourceVacancy: { id: m.vacancyId, title: m.vacancyTitle },
  retainedAs: m.reason,
  skills: m.skills,
  lastContactAt: m.movedAt,
  status: "suitable",
  reasonNote: m.note,
  addedAt: m.movedAt,
});
/** Seeded pool plus everyone moved here from Applicants / Shortlisting this session (one list, no duplicates). */
const allRows = (): TalentPoolRow[] => [...poolMoves().map(moveToRow), ...pool].filter((r) => textInScope(VACANCIES.find((v) => v.id === r.sourceVacancy.id)?.outlet));
/** Used by the shared store so a seeded person is never added a second time. */
/** Name, place and department of a seeded pool person, by their `a-uuid-tp-N` applicant id (so the profile page can open). */
export const seededPoolPerson = (applicantId: string) => pool.find((r) => r.applicantId === applicantId) ?? null;
export const isSeededInPool = (name: string) => pool.some((r) => r.name === name);

/** Overview summary, derived from the live fixture so both screens agree. */
export function talentPoolSummary(): TalentPoolSummary {
  if (getPrototypeMode() === "empty") return { count: 0, topSkills: [] };
  const tally = new Map<string, number>();
  allRows().forEach((r) => r.skills.forEach((s) => tally.set(s, (tally.get(s) ?? 0) + 1)));
  const topSkills = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
  return { count: allRows().length, topSkills };
}

const DAY = 86_400_000;
function matchesContact(at: string | null, f: LastContactFilter): boolean {
  if (!f) return true;
  if (f === "never") return at === null;
  if (at === null) return false;
  const days = (Date.now() - new Date(at).getTime()) / DAY;
  return f === "7d" ? days <= 7 : f === "30d" ? days <= 30 : f === "90d" ? days <= 90 : days > 90;
}

function build(q: TalentPoolQuery): TalentPoolPage {
  const needle = q.search.trim().toLowerCase();
  const base = allRows().filter(
    (r) =>
      (!needle || [r.name, r.location, r.sourceVacancy.title, ...r.appliedFor, ...r.skills].some((s) => s.toLowerCase().includes(needle))) &&
      (!q.skill || r.skills.includes(q.skill)) &&
      (!q.department || r.department === q.department) &&
      (!q.location || r.location === q.location) &&
      matchesContact(r.lastContactAt, q.lastContact),
  );
  const tabCounts = { all: base.length, suitable: base.filter((r) => r.status === "suitable").length, "follow-up": base.filter((r) => r.status === "needs-follow-up").length };
  const tabbed = (q.tab === "suitable" ? base.filter((r) => r.status === "suitable") : q.tab === "follow-up" ? base.filter((r) => r.status === "needs-follow-up") : base)
    .slice()
    .sort((a, b) => (q.sort === "oldest" ? cmpIso(a.lastContactAt, b.lastContactAt, "asc") : q.sort === "name" ? cmpText(a.name, b.name) : cmpIso(a.lastContactAt, b.lastContactAt, "desc")));
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  return {
    rows: tabbed.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
    total: tabbed.length,
    tabCounts,
    facets: { skills: uniq(allRows().flatMap((r) => r.skills)), departments: uniq(allRows().map((r) => r.department)), locations: uniq(allRows().map((r) => r.location)) },
    openVacancies: VACANCIES.filter((v) => textInScope(v.outlet)),
    workspaceEmpty: allRows().length === 0,
  };
}

export const mockTalentPoolAdapter: TalentPoolAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listPool(query) {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(300);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    if (mode === "empty") return { rows: [], total: 0, tabCounts: { all: 0, suitable: 0, "follow-up": 0 }, facets: { skills: [], departments: [], locations: [] }, openVacancies: VACANCIES, workspaceEmpty: true };
    return build(query);
  },

  async addToVacancy(id, input) {
    await sleep(350);
    const v = VACANCIES.find((x) => x.id === input.vacancyId);
    if (!v) throw new Error("Unknown vacancy");
    // Whether the person stays in the pool after being added needs Beeliv confirmation; the fixture keeps them.
    pool = pool.map((r) => (r.id === id && !r.appliedFor.includes(v.title) ? { ...r, appliedFor: [...r.appliedFor, v.title], lastContactAt: isoOffset(0, 9, 0) } : r));
  },

  async removeFromPool(id) {
    await sleep(350);
    if (id.startsWith("tp-m-")) removeMove(id.slice(5));
    else pool = pool.filter((r) => r.id !== id);
  },
};
