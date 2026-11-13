/**
 * DEV FIXTURE for Operations approvals. Everything is FICTIONAL ("Sample"
 * people, "Demo" clients). `BLV-APR-PLACEHOLDER-n` stands in for a
 * server-generated reference. The transitions (waiting -> approved / sent back /
 * rejected, one decision only, note required to send back or reject, stale
 * revision refused) are PROVISIONAL mock behaviour so the UI can be exercised;
 * the backend owns them (docs/contracts/ops-approvals.md, needs Beeliv
 * confirmation). No NIN / bank value exists anywhere in this fixture: a
 * sensitive document is only ever "on file". Nothing is emailed. Replace with a
 * Supabase adapter implementing OpsApprovalsAdapter.
 *
 * Previews: ?state=restricted (403), ?state=conflict (the first decision you
 * make is refused because someone else decided first), the shell's "Prototype
 * state" control (loading / empty / error).
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { ConflictError, type OpsApprovalsAdapter } from "./adapter";
import type {
  ApprovalDecision,
  ApprovalDetail,
  ApprovalHistoryEntry,
  ApprovalKind,
  ApprovalQuery,
  ApprovalRow,
  ApprovalStatus,
  ApprovalsPage,
  ApprovalTab,
  DocumentStatusLine,
  OpsSummary,
  ScoreLine,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();

const ME = "Adaeze Sample (Head of Operations)";
const COLLEAGUE = "Tobi Sample (Operations)";

const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));

/** Loading / restricted / error previews, same as the other Admin mocks. */
async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (urlState() === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(280);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

/* ---------- seeds ---------- */

const CLIENTS: Record<string, { name: string; outlet: string }> = {
  "c-demo-hotel": { name: "Demo Hotel Abuja", outlet: "Main building" },
  "c-demo-lounge": { name: "Demo Lounge Lagos", outlet: "Victoria Island" },
  "c-demo-grill": { name: "Demo Grill Port Harcourt", outlet: "Town centre" },
};

interface Seed {
  n: number;
  kind: ApprovalKind;
  applicantId: string;
  name: string;
  role: string;
  client: keyof typeof CLIENTS;
  status: ApprovalStatus;
  /** Days ago HR submitted it. */
  submitted: number;
  /** Days ago Operations decided it (decided seeds only). */
  decided?: number;
  note?: string;
  by?: string;
  tests: [string, string][];
  interviews: [string, string, string][];
  /** [cv, certificate, referees, NIN, bank] states. */
  docs: [DocState, DocState, DocState, DocState, DocState];
  verdict?: string;
  hrNote: string;
}
type DocState = DocumentStatusLine["state"];

const SEEDS: Seed[] = [
  { n: 1, kind: "selection", applicantId: "a-001", name: "Ada Sample", role: "Waiter / Waitress", client: "c-demo-hotel", status: "waiting", submitted: 4, tests: [["Training Test", "82%"]], interviews: [["Panel interview", "4 of 5", "Warm, confident with guests."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Strong table-service background and a clear test result. References were positive. Ready to start within three weeks." },
  { n: 2, kind: "selection", applicantId: "a-002", name: "Tunde Sample", role: "Commis Chef", client: "c-demo-lounge", status: "waiting", submitted: 2, tests: [["Training Test", "74%"]], interviews: [["Panel interview", "4 of 5", "Good knife skills; still learning menu costing."]], docs: ["verified", "verified", "pending", "verified", "pending"], hrNote: "Good fit for the kitchen team. One referee reply and the bank details are still being checked." },
  { n: 3, kind: "offer", applicantId: "a-003", name: "Chidi Sample", role: "Bar Attendant", client: "c-demo-lounge", status: "waiting", submitted: 1, tests: [["Training Test", "88%"]], interviews: [["Panel interview", "5 of 5", "Excellent cocktail knowledge."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Selection approved earlier. Offer terms follow the standard Bar Attendant band for this client." },
  { n: 4, kind: "offer", applicantId: "a-005", name: "Ngozi Sample", role: "Front Desk Officer", client: "c-demo-hotel", status: "waiting", submitted: 6, tests: [["Training Test", "79%"]], interviews: [["Panel interview", "4 of 5", "Calm under pressure."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Offer prepared. Start date matches the client's request." },
  { n: 5, kind: "selection", applicantId: "a-006", name: "Emeka Sample", role: "Floor Supervisor", client: "c-demo-hotel", status: "waiting", submitted: 0, tests: [["Training Test", "91%"]], interviews: [["Panel interview", "5 of 5", "Clear leadership examples."], ["Client interview", "4 of 5", "Client liked his handling of busy shifts."]], docs: ["verified", "verified", "verified", "requested-again", "verified"], hrNote: "Best candidate for the supervisor role. The identity document was requested again because the photo was unclear." },
  { n: 6, kind: "selection", applicantId: "a-011", name: "Halima Sample", role: "Waiter / Waitress", client: "c-demo-hotel", status: "approved", submitted: 9, decided: 7, note: "Approved. Good match for the weekend team.", tests: [["Training Test", "85%"]], interviews: [["Panel interview", "4 of 5", "Friendly and quick."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Recommended without reservations." },
  { n: 7, kind: "offer", applicantId: "a-010", name: "Segun Sample", role: "Front Desk Officer", client: "c-demo-hotel", status: "approved", submitted: 5, decided: 3, tests: [["Training Test", "77%"]], interviews: [["Panel interview", "4 of 5", "Good phone manner."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Offer terms are within the approved band." },
  { n: 8, kind: "selection", applicantId: "a-013", name: "Folake Sample", role: "Commis Chef", client: "c-demo-lounge", status: "sent-back", submitted: 8, decided: 5, note: "Please confirm the second referee before we approve.", tests: [["Training Test", "68%"]], interviews: [["Panel interview", "3 of 5", "Needs more kitchen hygiene practice."]], docs: ["verified", "pending", "missing", "verified", "pending"], hrNote: "Promising but the references are incomplete." },
  { n: 9, kind: "selection", applicantId: "a-017", name: "Tola Sample", role: "Floor Supervisor", client: "c-demo-grill", status: "rejected", submitted: 12, decided: 10, note: "Does not meet the supervisor experience Beeliv asked for.", tests: [["Training Test", "61%"]], interviews: [["Panel interview", "3 of 5", "Limited supervisory experience."]], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Recommended for a waiter role instead." },
  { n: 10, kind: "offer", applicantId: "a-019", name: "Dayo Sample", role: "Commis Chef", client: "c-demo-lounge", status: "sent-back", submitted: 7, decided: 4, note: "Start date is before the document check finishes. Please move it.", tests: [["Training Test", "80%"]], interviews: [["Panel interview", "4 of 5", "Strong fundamentals."]], docs: ["verified", "verified", "verified", "pending", "pending"], hrNote: "Offer prepared quickly because the client needs cover." },
];

const DOC_LABELS = ["CV", "Food handling certificate", "Referee contacts", "National ID (NIN)", "Bank details"];
const DOC_SENSITIVE = [false, false, false, true, true];

/* ---------- store ---------- */

let seq = 1;
const uid = () => `h-${seq++}`;
const entry = (at: string, actor: string, action: string, reason?: string): ApprovalHistoryEntry => ({ id: uid(), at, actor, action, reason });

const KIND_WORD: Record<ApprovalKind, string> = { selection: "selection", offer: "offer" };

function build(s: Seed): ApprovalDetail {
  const c = CLIENTS[s.client];
  const submittedAt = isoOffset(-s.submitted, 10, 15);
  const decidedAt = s.decided !== undefined ? isoOffset(-s.decided, 14, 40) : null;
  const decision: ApprovalDecision | null = s.status === "approved" ? "approve" : s.status === "sent-back" ? "send-back" : s.status === "rejected" ? "reject" : null;
  const decisionWord = decision === "approve" ? "Approved" : decision === "send-back" ? "Sent back" : "Rejected";
  const history: ApprovalHistoryEntry[] = [entry(submittedAt, "Funke Sample (HR)", `Submitted the ${KIND_WORD[s.kind]} for approval`)];
  if (decision && decidedAt) history.push(entry(decidedAt, ME, `${decisionWord} the ${KIND_WORD[s.kind]}`, s.note));
  const tests: ScoreLine[] = s.tests.map(([label, score], i) => ({ id: `t${i}`, label, score, detail: "Marked by HR" }));
  const interviews: ScoreLine[] = s.interviews.map(([label, score, detail], i) => ({ id: `i${i}`, label, score, detail }));
  const documents: DocumentStatusLine[] = DOC_LABELS.map((label, i) => ({ id: `d${i}`, label, state: s.docs[i], sensitive: DOC_SENSITIVE[i], reviewedBy: s.docs[i] === "verified" ? "Funke Sample (HR)" : null }));
  return {
    id: `apr-${s.n}`,
    reference: `BLV-APR-PLACEHOLDER-${s.n}`,
    kind: s.kind,
    applicant: { id: s.applicantId, name: s.name, photoUrl: null },
    vacancy: s.role,
    role: s.role,
    clientId: s.client,
    client: c.name,
    outlet: c.outlet,
    status: s.status,
    submittedAt,
    submittedBy: "Funke Sample (HR)",
    decidedAt,
    revision: 1 + history.length,
    applicantFacts: [
      { label: "Applied for", value: `${s.role}, ${c.name}` },
      { label: "Applied on", value: new Date(isoOffset(-(s.submitted + 20))).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
      { label: "Based in", value: s.client === "c-demo-hotel" ? "Abuja" : s.client === "c-demo-lounge" ? "Lagos" : "Port Harcourt" },
      { label: "Experience", value: s.n % 2 ? "3 years in hospitality" : "5 years in hospitality" },
    ],
    recommendation: { by: "Funke Sample (HR)", at: submittedAt, verdict: s.status === "rejected" ? "Recommended for another role" : "Recommended", note: s.hrNote },
    tests,
    interviews,
    documents,
    offerTerms:
      s.kind === "offer"
        ? [
            { label: "Role", value: s.role },
            { label: "Client and outlet", value: `${c.name}, ${c.outlet}` },
            { label: "Employment type", value: "Full-time" },
            { label: "Start date", value: new Date(isoOffset(21)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
          ]
        : null,
    offerPay:
      s.kind === "offer"
        ? [
            { key: "p1", label: "Basic pay", value: "NGN 170,000 per month", visibility: "public" },
            { key: "p2", label: "Staff meals", value: "One meal per shift", visibility: "public" },
            { key: "p3", label: "Performance bonus", value: "Discretionary, set by Beeliv", visibility: "internal" },
          ]
        : null,
    offerId: s.kind === "offer" ? `o-${s.n}` : null,
    decision: decision && decidedAt ? { decision, by: ME, at: decidedAt, note: s.note ?? null } : null,
    allowedDecisions: s.status === "waiting" ? ["approve", "send-back", "reject"] : [],
    history,
  };
}

let store: ApprovalDetail[] = [];
function reseed() {
  seq = 1;
  store = getPrototypeMode() === "empty" ? [] : SEEDS.map(build);
}
reseed();
subscribePrototypeMode(() => {
  reseed();
  listeners.forEach((l) => l("reset"));
});

const clone = (d: ApprovalDetail): ApprovalDetail => ({ ...d, history: [...d.history].sort((a, b) => b.at.localeCompare(a.at)) });

const tabOf = (s: ApprovalStatus): ApprovalTab => (s === "waiting" ? "waiting" : s === "approved" ? "approved" : "sent-back");

const toRow = (d: ApprovalDetail): ApprovalRow => ({
  id: d.id,
  reference: d.reference,
  kind: d.kind,
  applicant: d.applicant,
  vacancy: d.vacancy,
  role: d.role,
  clientId: d.clientId,
  client: d.client,
  outlet: d.outlet,
  status: d.status,
  submittedAt: d.submittedAt,
  submittedBy: d.submittedBy,
  decidedAt: d.decidedAt,
});

/**
 * The Head of Operations decides a SELECTION from the applicant record (not from the
 * Approvals list). Keeps the Approvals store consistent: an existing waiting selection
 * approval for the person is decided; otherwise a decided one is derived so it appears
 * under Approved / Sent back, with an honest history (nobody "submitted" it).
 * PROTOTYPE only; the server owns approval records.
 */
export function syncSelectionDecision(p: { applicantId: string; name: string; role: string; clientId: string }, decision: "approve" | "reject", note?: string): void {
  const at = new Date().toISOString();
  const word = decision === "approve" ? "Approved" : "Rejected";
  const existing = store.find((x) => x.kind === "selection" && x.applicant.id === p.applicantId && x.status === "waiting");
  if (existing) {
    existing.status = decision === "approve" ? "approved" : "rejected";
    existing.decidedAt = at;
    existing.decision = { decision, by: ME, at, note: note || null };
    existing.allowedDecisions = [];
    existing.history.push(entry(at, ME, `${word} the selection`, note || undefined));
    existing.revision += 1;
    return;
  }
  const clientId = (p.clientId in CLIENTS ? p.clientId : "c-demo-hotel") as keyof typeof CLIENTS;
  const d = build({ n: store.length + 1, kind: "selection", applicantId: p.applicantId, name: p.name, role: p.role, client: clientId, status: decision === "approve" ? "approved" : "rejected", submitted: 0, decided: 0, note, tests: [], interviews: [], docs: ["verified", "verified", "verified", "verified", "verified"], hrNote: "Decided by the Head of Operations directly from the applicant record. HR did not submit a separate request." });
  d.submittedBy = ME;
  d.submittedAt = at;
  d.recommendation = { ...d.recommendation, by: ME, at, verdict: "Decided directly" };
  d.history = [entry(at, ME, `${word} the selection from the applicant record`, note)];
  store = [d, ...store];
}

/* ---------- adapter ---------- */

export const mockOpsApprovalsAdapter: OpsApprovalsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async getSummary(): Promise<OpsSummary> {
    await gate();
    const waiting = store.filter((d) => d.status === "waiting");
    return {
      waitingSelections: waiting.filter((d) => d.kind === "selection").length,
      waitingOffers: waiting.filter((d) => d.kind === "offer").length,
      sentBack: store.filter((d) => tabOf(d.status) === "sent-back").length,
      approved: store.filter((d) => d.status === "approved").length,
      oldestWaitingAt: waiting.map((d) => d.submittedAt).sort()[0] ?? null,
    };
  },

  async listApprovals(q: ApprovalQuery): Promise<ApprovalsPage> {
    await gate();
    const needle = q.search.trim().toLowerCase();
    const base = store.filter((d) => {
      if (q.kind && d.kind !== q.kind) return false;
      if (q.clientId && d.clientId !== q.clientId) return false;
      if (needle && !`${d.applicant.name} ${d.role} ${d.client} ${d.outlet}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const tabCounts: Record<ApprovalTab, number> = { waiting: 0, approved: 0, "sent-back": 0 };
    base.forEach((d) => tabCounts[tabOf(d.status)]++);
    const inTab = base.filter((d) => tabOf(d.status) === q.tab);
    // Waiting: longest wait first. Decided: most recent decision first.
    const rows = inTab
      .sort((a, b) => (q.tab === "waiting" ? a.submittedAt.localeCompare(b.submittedAt) : (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")))
      .map(toRow);
    return {
      rows,
      total: rows.length,
      tabCounts,
      facets: { clients: Object.entries(CLIENTS).map(([id, c]) => ({ id, name: c.name })) },
      workspaceEmpty: store.length === 0,
    };
  },

  async getApproval(id) {
    await gate();
    const d = store.find((x) => x.id === id);
    return d ? clone(d) : null;
  },

  async decide(id, input) {
    await gate();
    const d = store.find((x) => x.id === id);
    if (!d) throw new Error("Not found");
    const note = input.note.trim();
    if (input.decision !== "approve" && !note) throw new Error("A note is required");

    // Conflict preview: a colleague decides first, then this attempt is refused.
    if (urlState() === "conflict" && d.status === "waiting") {
      const at = new Date().toISOString();
      d.status = "approved";
      d.decidedAt = at;
      d.decision = { decision: "approve", by: COLLEAGUE, at, note: null };
      d.allowedDecisions = [];
      d.history.push(entry(at, COLLEAGUE, `Approved the ${KIND_WORD[d.kind]}`));
      d.revision += 1;
      throw new ConflictError();
    }
    if (d.status !== "waiting" || input.expectedRevision !== d.revision) throw new ConflictError();

    const at = new Date().toISOString();
    d.status = input.decision === "approve" ? "approved" : input.decision === "send-back" ? "sent-back" : "rejected";
    d.decidedAt = at;
    d.decision = { decision: input.decision, by: ME, at, note: note || null };
    d.allowedDecisions = [];
    const word = input.decision === "approve" ? "Approved" : input.decision === "send-back" ? "Sent back" : "Rejected";
    d.history.push(entry(at, ME, `${word} the ${KIND_WORD[d.kind]}`, note || undefined));
    d.revision += 1;
    return clone(d);
  },
};
