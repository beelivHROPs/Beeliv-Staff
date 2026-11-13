/**
 * DEV FIXTURE for Shortlisting. Everything is FICTIONAL ("Sample" people).
 * Writes are in-memory and reset with the Prototype state control. Not wired to
 * the Applicants / Talent Pool fixtures (separate mocks); the real backend is
 * one source. Replace with a Supabase adapter implementing ShortlistingAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { cmpIso, cmpText } from "../sort";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { previewGate } from "../interviews/mock";
import { addToPool, isMoved, subscribePool } from "../pool-store";
import { isSeededInPool } from "../talent-pool/mock";
import type { ShortlistingAdapter } from "./adapter";
import type { FitLabel, ScreeningRow, ScreeningStatus, ScreeningTab, ShortlistingPage, ShortlistingQuery } from "./types";

const listeners = new Set<(e: AdapterEvent) => void>();

const VACANCIES = [
  { id: "v-waiter", name: "Waiter / Waitress" },
  { id: "v-chef", name: "Commis Chef" },
  { id: "v-bar", name: "Bar Attendant" },
  { id: "v-desk", name: "Front Desk Officer" },
  { id: "v-floor", name: "Floor Supervisor" },
];

/** app no, name, vacancy idx, location, years, skills, docs %, profile %, days ago, status, fit score */
type Seed = [number, string, number, string, number, string[], number, number, number, ScreeningStatus, number | null];
const SEEDS: Seed[] = [
  [4, "Bisi Sample", 0, "Abuja", 1, ["POS", "Fine dining"], 0, 70, 1, "to-screen", 62],
  [5, "Ngozi Sample", 3, "Port Harcourt", 4, ["Reception", "Reservations", "Customer care"], 20, 100, 6, "to-screen", 88],
  [7, "Zainab Sample", 0, "Kano", 0, ["Customer care"], 0, 55, 0, "to-screen", 34],
  [8, "Yusuf Sample", 1, "Lagos", 2, ["Grill", "Food safety"], 10, 90, 4, "to-screen", 71],
  [12, "Ifeanyi Sample", 4, "Abuja", 6, ["Team lead", "Rostering", "Banquet service"], 0, 80, 2, "to-screen", 91],
  [18, "Maryam Sample", 0, "Lagos", 1, ["POS"], 0, 40, 0, "to-screen", null],
  [20, "Kemi Sample", 2, "Abuja", 3, ["Cocktails", "Inventory"], 0, 65, 3, "to-screen", 79],
  [26, "Wale Sample", 0, "Abuja", 5, ["Banquet service", "Upselling", "POS"], 0, 90, 1, "to-screen", 84],
  [22, "Lara Sample", 0, "Lagos", 3, ["Fine dining", "POS"], 15, 100, 5, "shortlisted", 82],
  [21, "Uche Sample", 3, "Abuja", 2, ["Reception"], 25, 100, 7, "shortlisted", 66],
  [9, "Amaka Sample", 2, "Lagos", 4, ["Cocktails", "Upselling"], 30, 100, 8, "shortlisted", 85],
  [2, "Tunde Sample", 1, "Abuja", 5, ["Grill", "Menu prep"], 40, 100, 9, "shortlisted", 90],
  [14, "Gbenga Sample", 1, "Lagos", 2, ["Pastry"], 0, 85, 14, "hold", 58],
  [23, "Musa Sample", 4, "Abuja", 7, ["Team lead", "Fine dining"], 45, 100, 19, "hold", 77],
  [15, "Rukky Sample", 0, "Lagos", 0, ["POS"], 20, 100, 18, "rejected", 28],
  [16, "Obinna Sample", 3, "Abuja", 3, ["Reservations", "Customer care"], 30, 100, 33, "talent-pool", 69],
];

const aId = (n: number) => `a-${String(n).padStart(3, "0")}`;
const fitOf = (s: number | null): FitLabel | null => (s === null ? null : s >= 80 ? "strong" : s >= 60 ? "possible" : "weak");

function build(): ScreeningRow[] {
  return SEEDS.map(([n, name, v, location, experienceYears, skills, documentsPercent, profilePercent, days, status, fit]) => ({
    id: aId(n),
    reference: `BLV-APP-PLACEHOLDER-${n}`,
    name,
    vacancyId: VACANCIES[v].id,
    vacancy: VACANCIES[v].name,
    location,
    experienceYears,
    skills,
    documentsPercent,
    profilePercent,
    appliedAt: isoOffset(-days, 10, 15),
    status,
    fitScore: fit,
    fitLabel: fitOf(fit),
    note: status === "hold" ? "Waiting for a second reference." : status === "rejected" ? "Does not meet the minimum experience for this role." : null,
  }));
}

let rows: ScreeningRow[] = build();
subscribePool(() => listeners.forEach((l) => l("reset")));
subscribePrototypeMode(() => {
  rows = build();
  listeners.forEach((l) => l("reset"));
});

const expMatch = (y: number, f: ShortlistingQuery["experience"]) => !f || (f === "0-1" ? y <= 1 : f === "2-3" ? y >= 2 && y <= 3 : f === "4-5" ? y >= 4 && y <= 5 : y >= 6);
const docMatch = (p: number, f: ShortlistingQuery["documents"]) => !f || (f === "complete" ? p >= 100 : f === "none" ? p === 0 : p > 0 && p < 100);

const TARGET: Record<"shortlist" | "hold" | "reject" | "talent-pool", ScreeningStatus> = { shortlist: "shortlisted", hold: "hold", reject: "rejected", "talent-pool": "talent-pool" };

export const mockShortlistingAdapter: ShortlistingAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listCandidates(q) {
    await previewGate();
    const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
    const facets: ShortlistingPage["facets"] = { vacancies: VACANCIES, locations: uniq(rows.map((r) => r.location)), skills: uniq(rows.flatMap((r) => r.skills)) };
    if (getPrototypeMode() === "empty") {
      const z = { all: 0, "to-screen": 0, shortlisted: 0, hold: 0, rejected: 0, "talent-pool": 0 };
      return { rows: [], total: 0, tabCounts: z, facets, workspaceEmpty: true };
    }
    const needle = q.search.trim().toLowerCase();
    // Talent Pool membership comes from the one shared store, so a move made on any screen shows here.
    const live = rows.map((r) => (isMoved(r.id) ? { ...r, status: "talent-pool" as const } : r));
    const base = live.filter(
      (r) =>
        (!needle || [r.name, r.vacancy, r.location, ...r.skills].some((s) => s.toLowerCase().includes(needle))) &&
        (!q.vacancyId || r.vacancyId === q.vacancyId) &&
        (!q.location || r.location === q.location) &&
        (!q.skill || r.skills.includes(q.skill)) &&
        expMatch(r.experienceYears, q.experience) &&
        docMatch(r.documentsPercent, q.documents),
    );
    const count = (t: ScreeningTab) => (t === "all" ? base.length : base.filter((r) => r.status === t).length);
    const tabbed = (q.tab === "all" ? base : base.filter((r) => r.status === q.tab)).sort((a, b) => (q.sort === "oldest" ? cmpIso(a.appliedAt, b.appliedAt, "asc") : q.sort === "match" ? (b.fitScore ?? -1) - (a.fitScore ?? -1) : q.sort === "name" ? cmpText(a.name, b.name) : cmpIso(a.appliedAt, b.appliedAt, "desc")));
    return {
      rows: tabbed.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      total: tabbed.length,
      tabCounts: { all: count("all"), "to-screen": count("to-screen"), shortlisted: count("shortlisted"), hold: count("hold"), rejected: count("rejected"), "talent-pool": count("talent-pool") },
      facets,
      workspaceEmpty: rows.length === 0,
    };
  },

  async bulkAction(ids, input) {
    await new Promise((r) => setTimeout(r, 450));
    const target = TARGET[input.action];
    if ((input.action === "hold" || input.action === "reject") && !input.note?.trim()) throw new Error("A screening note is required");
    let changed = 0;
    let skipped = 0;
    rows = rows.map((r) => {
      if (!ids.includes(r.id)) return r;
      if (input.action === "talent-pool") {
        if (r.status === "talent-pool" || isMoved(r.id) || isSeededInPool(r.name)) {
          skipped++;
          return r;
        }
        addToPool({ applicantId: r.id, name: r.name, location: r.location, department: "Hospitality", vacancyId: r.vacancyId, vacancyTitle: r.vacancy, reason: r.status === "shortlisted" ? "shortlisted-unplaced" : "not-selected", note: input.note?.trim() || null, skills: r.skills });
        changed++;
        return r;
      }
      if (r.status === target) {
        skipped++;
        return r;
      }
      changed++;
      return { ...r, status: target, note: input.note?.trim() || r.note };
    });
    return { changed, skipped };
  },
};
