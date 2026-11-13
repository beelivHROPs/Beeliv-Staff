/** DEV FIXTURE for assessment results (read-only). FICTIONAL people. Replace with a Supabase adapter implementing AssessmentsAdapter. */
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { cmpIso, cmpText } from "../sort";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { previewGate } from "../interviews/mock";
import type { AssessmentsAdapter } from "./adapter";
import type { AssessmentDetail, AssessmentRecommendation, AssessmentRow, AssessmentsPage, AssessmentStatus } from "./types";

const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

const TYPES = [
  { id: "t-service", name: "Service practical" },
  { id: "t-kitchen", name: "Kitchen practical" },
  { id: "t-bar", name: "Bar practical" },
  { id: "t-knowledge", name: "Hospitality knowledge" },
];
const VACANCIES = [
  { id: "v-waiter", name: "Waiter / Waitress" },
  { id: "v-chef", name: "Commis Chef" },
  { id: "v-bar", name: "Bar Attendant" },
  { id: "v-desk", name: "Front Desk Officer" },
  { id: "v-floor", name: "Floor Supervisor" },
];
const EVALUATORS = [
  { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" },
];

/** app no, name, vacancy, type, day offset, evaluator, status, score (of 20), recommendation */
type Seed = [number, string, number, number, number, number, AssessmentStatus, number | null, AssessmentRecommendation | null];
const SEEDS: Seed[] = [
  [3, "Chidi Sample", 2, 2, 1, 1, "scheduled", null, null],
  [24, "Peace Sample", 2, 2, 4, 1, "scheduled", null, null],
  [13, "Folake Sample", 1, 1, -6, 1, "completed", 18, "meets-standard"],
  [6, "Emeka Sample", 4, 0, -2, 0, "awaiting-result", null, null],
  [10, "Segun Sample", 3, 3, -5, 0, "completed", 11, "needs-retake"],
  [19, "Dayo Sample", 1, 1, -3, 1, "completed", 9, "below-standard"],
  [11, "Halima Sample", 0, 0, -4, 0, "completed", 16, "meets-standard"],
  [9, "Amaka Sample", 2, 3, 3, 0, "scheduled", null, null],
  [1, "Ada Sample", 0, 0, -9, 0, "cancelled", null, null],
];

const aId = (n: number) => `a-${String(n).padStart(3, "0")}`;

function all(): AssessmentDetail[] {
  return SEEDS.map(([n, name, v, t, day, ev, status, score, rec], i) => {
    const at = isoOffset(day, 10, 0);
    const done = score !== null;
    const share = (k: number) => (score === null ? 0 : Math.min(5, Math.floor(score / 4) + (k < score % 4 ? 1 : 0)));
    const row: AssessmentRow = {
      id: `s-${String(i + 1).padStart(3, "0")}`,
      applicantId: aId(n),
      candidateName: name,
      vacancyId: VACANCIES[v].id,
      vacancy: VACANCIES[v].name,
      typeId: TYPES[t].id,
      typeName: TYPES[t].name,
      evaluator: EVALUATORS[ev],
      at,
      score,
      maxScore: done ? 20 : null,
      status,
      recommendation: rec,
    };
    return {
      ...row,
      applicantReference: `BLV-APP-PLACEHOLDER-${n}`,
      breakdown: done
        ? ["Technical skill", "Speed and organisation", "Hygiene and safety", "Guest handling"].map((criterion, k) => ({ criterion, score: share(k), max: 5 }))
        : [],
      evaluatorNotes: done ? "Sample evaluator notes. The evaluator's own words are kept as written." : null,
      history: [
        { id: `s${i}-h1`, actor: "Funke Sample", at: isoOffset(day - 4, 9, 0), action: "Assessment booked", from: null, to: "Scheduled", note: null },
        ...(done ? [{ id: `s${i}-h2`, actor: EVALUATORS[ev].name, at, action: "Result recorded", from: "Awaiting result", to: "Completed", note: null }] : []),
      ],
    };
  });
}

export const mockAssessmentsAdapter: AssessmentsAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listAssessments(q) {
    await previewGate();
    const facets: AssessmentsPage["facets"] = { types: TYPES, vacancies: VACANCIES };
    if (getPrototypeMode() === "empty") return { rows: [], total: 0, tabCounts: { all: 0, scheduled: 0, "awaiting-result": 0, completed: 0 }, facets, workspaceEmpty: true };
    const needle = q.search.trim().toLowerCase();
    const base = all().filter(
      (r) =>
        (!needle || [r.candidateName, r.vacancy, r.typeName, r.evaluator?.name ?? ""].some((s) => s.toLowerCase().includes(needle))) &&
        (!q.typeId || r.typeId === q.typeId) &&
        (!q.vacancyId || r.vacancyId === q.vacancyId),
    );
    const count = (t: string) => (t === "all" ? base.length : base.filter((r) => r.status === t).length);
    const tabbed = (q.tab === "all" ? base : base.filter((r) => r.status === q.tab)).sort((a, b) => (q.sort === "oldest" ? cmpIso(a.at, b.at, "asc") : q.sort === "candidate" ? cmpText(a.candidateName, b.candidateName) : q.sort === "score" ? (b.score ?? -1) - (a.score ?? -1) : cmpIso(a.at, b.at, "desc")));
    return {
      rows: tabbed.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((d) => ({ ...d })),
      total: tabbed.length,
      tabCounts: { all: count("all"), scheduled: count("scheduled"), "awaiting-result": count("awaiting-result"), completed: count("completed") },
      facets,
      workspaceEmpty: false,
    };
  },

  async getAssessment(id) {
    const mode = await previewGate();
    if (mode === "empty") return null;
    return all().find((x) => x.id === id) ?? null;
  },
};
