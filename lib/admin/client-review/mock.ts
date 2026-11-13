/**
 * DEV FIXTURE for Client Review. Everything is FICTIONAL. The first six
 * candidates mirror the Client app fixture (lib/client/adapters/mock-data.ts)
 * so both apps tell the same story. Writes are in-memory, append history, and
 * reset with the Prototype state control. The overdue threshold below is a
 * fixture value only: it needs Beeliv confirmation.
 * Replace with a Supabase adapter implementing ClientReviewAdapter; no screen changes.
 *
 * Preview helper: add `?state=restricted` to see the unauthorized state.
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { ClientReviewAdapter } from "./adapter";
import { DECISION_LABEL, STATUS_LABEL, type ClientContact, type ClientReviewDetail, type ClientReviewPage, type ClientReviewQuery, type ClientReviewRow, type ClientComment, type ClientDecision, type ProfilePack, type ReviewHistoryEntry, type SubmissionStatus } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});

async function previewGate(ms = 300) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const listeners = new Set<(e: AdapterEvent) => void>();
const ME = "Funke Sample";
const OVERDUE_AFTER_DAYS = 5; // FIXTURE ONLY: the real threshold needs Beeliv confirmation.

const CLIENTS = [
  { id: "c-kalina", name: "Kalina Hospitality" },
  { id: "c-lounge", name: "Demo Lounge Lagos" },
];
const VACANCIES = [
  { id: "v-sup", name: "Restaurant Supervisor", clientId: "c-kalina", outlet: "Kalina Abuja" },
  { id: "v-sous", name: "Sous Chef", clientId: "c-kalina", outlet: "Kalina Lekki" },
  { id: "v-bar", name: "Bartender", clientId: "c-lounge", outlet: "Demo Lounge Lagos" },
  { id: "v-host", name: "Host / Hostess", clientId: "c-kalina", outlet: "Kalina Lagos" },
];
const CONTACTS: Record<string, ClientContact[]> = {
  "c-kalina": [
    { id: "ct-1", name: "Mr. Adeyemi (Sample)", role: "Owner" },
    { id: "ct-2", name: "Bisi Sample", role: "Operations manager" },
  ],
  "c-lounge": [{ id: "ct-3", name: "Tosin Sample", role: "General manager" }],
};

const pack = (profileSummary: string, experienceSummary: string, skills: string[], interviewSummary: string, documents: string[]): ProfilePack => ({ profileSummary, experienceSummary, skills, interviewSummary, documents });

/** n, name, vacancy idx, status, decision, days since submitted (null = not submitted), recordedByHr, years, pack */
type Seed = [number, string, number, SubmissionStatus, ClientDecision, number | null, boolean, number, ProfilePack];
const SEEDS: Seed[] = [
  [1, "Ifeoma Nwosu", 0, "submitted", "awaiting", 2, false, 6, pack("Confident floor leader who has run busy dining rooms and trained new servers.", "6 years in full-service restaurants", ["Team leadership", "Guest relations", "Rota planning"], "Interviewed by Beeliv HR. Clear communicator with strong guest-handling examples. Assessment: recommended for review.", ["CV", "Food Handling Certificate", "Reference letter"])],
  [2, "Kelechi Obi", 0, "submitted", "awaiting", 7, false, 4, pack("Hotel-trained supervisor with a strong service-standards background.", "4 years, hotel dining rooms", ["Service standards", "Training", "POS systems"], "Interviewed by Beeliv HR. Calm under pressure; keen on training roles. Assessment: recommended for review.", ["CV", "Food Handling Certificate"])],
  [3, "Adaeze Uche", 0, "submitted", "awaiting", 3, false, 5, pack("Experienced in both casual and fine dining floors; handles complaints well.", "5 years, casual and fine dining", ["Floor management", "Complaint handling"], "Interviewed by Beeliv HR. Practical, people-first approach. Assessment: recommended for review.", ["CV", "Reference letter"])],
  [4, "Damilola Fashola", 1, "submitted", "awaiting", 3, false, 7, pack("Senior hotel-kitchen cook with menu costing and team supervision experience.", "7 years in hotel kitchens", ["Menu costing", "Team supervision", "HACCP"], "Interviewed by Beeliv HR. Strong technical answers; practical kitchen assessment passed.", ["CV", "Food Safety Certificate", "Reference letter"])],
  [5, "Chidi Onuoha", 1, "submitted", "awaiting", 9, false, 5, pack("Restaurant-kitchen cook comfortable running a section.", "5 years, restaurant kitchens", ["Grill and sauce", "Prep planning"], "Interviewed by Beeliv HR. Good prep discipline; practical kitchen assessment passed.", ["CV", "Food Safety Certificate"])],
  [6, "Rasheed Ogunbanjo", 1, "submitted", "interested", 5, false, 6, pack("Large-volume production specialist from banqueting and catering.", "6 years, banqueting and catering", ["Large-volume production", "Stock control"], "Interviewed by Beeliv HR. Reliable and organised; practical kitchen assessment passed.", ["CV", "Food Safety Certificate", "Reference letter"])],
  [7, "Amaka Sample", 2, "submitted", "interview-requested", 6, false, 3, pack("Energetic bartender with cocktail and speed-service experience.", "3 years, lounges and bars", ["Cocktails", "Speed service", "Cash handling"], "Interviewed by Beeliv HR. Friendly and quick; strong product knowledge.", ["CV", "Certificate of service"])],
  [8, "Tunde Sample", 2, "submitted", "not-suitable", 8, true, 2, pack("Junior bartender, still building range.", "2 years, casual bars", ["Beer and spirits", "Cash handling"], "Interviewed by Beeliv HR. Good attitude; limited cocktail range.", ["CV"])],
  [9, "Halima Sample", 3, "ready", "awaiting", null, false, 3, pack("Polished front-of-house host with strong first impressions.", "3 years, hotel front desk and restaurant host", ["Guest greeting", "Reservations"], "Interviewed by Beeliv HR. Warm and well presented.", ["CV", "Reference letter"])],
  [10, "Segun Sample", 3, "ready", "awaiting", null, false, 2, pack("Reliable host with reservation-system experience.", "2 years, restaurants", ["Reservations", "Teamwork"], "Interviewed by Beeliv HR. Dependable; good with queues.", ["CV"])],
  [11, "Lara Sample", 2, "withdrawn", "awaiting", 12, false, 4, pack("Bartender who has since accepted another offer.", "4 years, hotel bars", ["Cocktails", "Inventory"], "Interviewed by Beeliv HR. Strong all-round.", ["CV"])],
  [12, "Peace Sample", 0, "returned", "awaiting", 10, false, 3, pack("Supervisor candidate returned to the shortlist for another role.", "3 years, cafes", ["Opening and closing", "Training"], "Interviewed by Beeliv HR. Good fit for smaller outlets.", ["CV"])],
];

interface Item {
  base: Omit<ClientReviewRow, "daysWaiting" | "overdue" | "nextAction" | "needsAttention">;
  submittedAt: string | null;
  submittedTo: ClientContact | null;
  note: string | null;
  years: number;
  pack: ProfilePack;
  comments: ClientComment[];
  history: ReviewHistoryEntry[];
}

const sId = (i: number) => `cr-${String(i + 1).padStart(3, "0")}`;
const aId = (n: number) => `a-${String(n).padStart(3, "0")}`;

function build(): Item[] {
  return SEEDS.map(([n, name, v, status, decision, ago, byHr, years, p], i) => {
    const vac = VACANCIES[v];
    const client = CLIENTS.find((c) => c.id === vac.clientId)!;
    const submittedAt = ago === null ? null : isoOffset(-ago, 10, 0);
    const to = ago === null ? null : CONTACTS[client.id][0];
    const history: ReviewHistoryEntry[] = [{ id: `${sId(i)}-h0`, actor: ME, at: isoOffset(-(ago ?? 3) - 2, 9, 0), action: "Added to Client Review", from: null, to: "Ready to submit", note: null }];
    const comments: ClientComment[] = [];
    if (submittedAt && to) history.push({ id: `${sId(i)}-h1`, actor: ME, at: submittedAt, action: "Submitted to client", from: "Ready to submit", to: "With client", note: `Sent to ${to.name}.` });
    if (decision !== "awaiting" && ago !== null) {
      history.push({ id: `${sId(i)}-h2`, actor: byHr ? ME : "Client", at: isoOffset(-Math.max(0, ago - 2), 14, 0), action: byHr ? "Client feedback recorded outside the app" : "Client feedback received", from: "Awaiting client", to: DECISION_LABEL[decision], note: byHr ? "Client phoned the HR desk and said the candidate needs more cocktail experience." : null });
      if (decision === "interview-requested") comments.push({ id: `${sId(i)}-c1`, text: "Could they come in on Thursday afternoon?", at: isoOffset(-Math.max(0, ago - 2), 14, 5), source: "client-app", by: "Client" });
      if (byHr) comments.push({ id: `${sId(i)}-c2`, text: "Needs more cocktail experience.", at: isoOffset(-Math.max(0, ago - 2), 14, 6), source: "recorded-by-hr", by: ME });
    }
    if (status === "withdrawn") history.push({ id: `${sId(i)}-h3`, actor: ME, at: isoOffset(-(ago ?? 0) + 1, 11, 0), action: "Submission withdrawn", from: "With client", to: "Withdrawn", note: "Candidate accepted another offer." });
    if (status === "returned") history.push({ id: `${sId(i)}-h3`, actor: ME, at: isoOffset(-(ago ?? 0) + 2, 11, 0), action: "Returned to shortlist", from: "With client", to: "Returned to shortlist", note: "Better suited to a smaller outlet." });
    return {
      base: { id: sId(i), applicantId: aId(n), candidateName: name, photoUrl: null, vacancyId: vac.id, vacancy: vac.name, clientId: client.id, client: client.name, outlet: vac.outlet, status, decision, recordedByHr: byHr, submittedAt },
      submittedAt,
      submittedTo: to,
      note: to ? "Shortlisted after interview and practical assessment." : null,
      years,
      pack: p,
      comments,
      history,
    };
  });
}

let items: Item[] = build();
subscribePrototypeMode(() => {
  items = build();
  listeners.forEach((l) => l("reset"));
});

function rowOf(it: Item): ClientReviewRow {
  const b = it.base;
  const waiting = b.status === "submitted" && b.decision === "awaiting" && it.submittedAt ? Math.max(0, Math.floor((Date.now() - new Date(it.submittedAt).getTime()) / 86_400_000)) : null;
  const overdue = waiting !== null && waiting >= OVERDUE_AFTER_DAYS;
  let nextAction: string | null = null;
  if (b.status === "ready") nextAction = "Submit to client";
  else if (b.status === "submitted" && b.decision === "awaiting") nextAction = overdue ? "Chase the client" : "Wait for client";
  else if (b.status === "submitted" && b.decision === "interview-requested") nextAction = "Arrange client interview";
  else if (b.status === "submitted" && b.decision === "interested") nextAction = "Pass to Operations for approval";
  else if (b.status === "submitted" && b.decision === "not-suitable") nextAction = "Review and close";
  return { ...b, daysWaiting: waiting, overdue, nextAction, needsAttention: overdue || b.status === "ready" || (b.status === "submitted" && b.decision === "interview-requested") };
}

function detailOf(it: Item): ClientReviewDetail {
  const r = rowOf(it);
  const submitted = r.status === "submitted";
  return {
    ...r,
    applicantReference: `BLV-APP-PLACEHOLDER-${it.base.applicantId.slice(2)}`,
    identityMasked: "NIN on file, hidden",
    experienceYears: it.years,
    submittedTo: it.submittedTo,
    submissionNote: it.note,
    contacts: CONTACTS[it.base.clientId] ?? [],
    pack: it.pack,
    comments: [...it.comments].sort((a, b) => b.at.localeCompare(a.at)),
    history: [...it.history].sort((a, b) => b.at.localeCompare(a.at)),
    capabilities: {
      canSubmit: r.status === "ready",
      canWithdraw: submitted,
      canRecordFeedback: submitted && r.decision === "awaiting",
      canReturnToShortlist: r.status === "ready" || submitted,
    },
  };
}

function tabOf(r: ClientReviewRow): ClientReviewQuery["tab"] {
  if (r.status === "ready") return "ready";
  if (r.status === "submitted") return r.decision === "awaiting" ? "awaiting" : "feedback";
  return "closed";
}

function matches(r: ClientReviewRow, q: ClientReviewQuery): boolean {
  const needle = q.search.trim().toLowerCase();
  if (needle && ![r.candidateName, r.vacancy, r.client, r.outlet ?? ""].some((s) => s.toLowerCase().includes(needle))) return false;
  if (q.clientId && r.clientId !== q.clientId) return false;
  if (q.vacancyId && r.vacancyId !== q.vacancyId) return false;
  return true;
}

function mutate(id: string, fn: (it: Item) => Item): ClientReviewDetail {
  const idx = items.findIndex((x) => x.base.id === id);
  if (idx < 0) throw new Error("Unknown submission");
  const next = fn(items[idx]);
  items = items.map((x, k) => (k === idx ? next : x));
  return detailOf(next);
}

const hist = (it: Item, action: string, from: string | null, to: string | null, note: string | null): ReviewHistoryEntry[] => [...it.history, { id: `${it.base.id}-h${it.history.length + 1}`, actor: ME, at: new Date().toISOString(), action, from, to, note }];
const stateLabel = (it: Item) => (it.base.status === "submitted" && it.base.decision !== "awaiting" ? DECISION_LABEL[it.base.decision] : STATUS_LABEL[it.base.status]);

export const mockClientReviewAdapter: ClientReviewAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listSubmissions(q) {
    const mode = await previewGate();
    const facets: ClientReviewPage["facets"] = { clients: CLIENTS, vacancies: VACANCIES.map((v) => ({ id: v.id, name: v.name })) };
    const zero = { ready: 0, awaiting: 0, feedback: 0, closed: 0 };
    if (mode === "empty") return { rows: [], total: 0, tabCounts: zero, facets, workspaceEmpty: true };
    const base = items.map(rowOf).filter((r) => matches(r, q));
    const counts = { ...zero };
    base.forEach((r) => (counts[tabOf(r)] += 1));
    const tabbed = base.filter((r) => tabOf(r) === q.tab).sort((a, b) => (b.daysWaiting ?? -1) - (a.daysWaiting ?? -1) || a.candidateName.localeCompare(b.candidateName));
    return { rows: tabbed.slice(0, q.limit), total: tabbed.length, tabCounts: counts, facets, workspaceEmpty: false };
  },

  async getSubmission(id) {
    const mode = await previewGate();
    if (mode === "empty") return null;
    const it = items.find((x) => x.base.id === id);
    return it ? detailOf(it) : null;
  },

  async submitToClient(id, input) {
    await sleep(400);
    return mutate(id, (it) => {
      const contact = (CONTACTS[it.base.clientId] ?? []).find((c) => c.id === input.contactId);
      if (!contact) throw new Error("Unknown client contact");
      const at = new Date().toISOString();
      return { ...it, base: { ...it.base, status: "submitted", decision: "awaiting" }, submittedAt: at, submittedTo: contact, note: input.note || null, history: hist(it, "Submitted to client", "Ready to submit", "With client", `Sent to ${contact.name}.${input.note ? ` ${input.note}` : ""}`) };
    });
  },

  async withdrawSubmission(id, input) {
    await sleep(400);
    return mutate(id, (it) => ({ ...it, base: { ...it.base, status: "withdrawn" }, history: hist(it, "Submission withdrawn", stateLabel(it), "Withdrawn", input.reason) }));
  },

  async recordFeedback(id, input) {
    await sleep(400);
    return mutate(id, (it) => ({
      ...it,
      base: { ...it.base, decision: input.decision, recordedByHr: true },
      comments: input.comment ? [...it.comments, { id: `${it.base.id}-c${it.comments.length + 1}`, text: input.comment, at: new Date().toISOString(), source: "recorded-by-hr", by: ME }] : it.comments,
      history: hist(it, "Client feedback recorded outside the app", "Awaiting client", DECISION_LABEL[input.decision], input.reason),
    }));
  },

  async returnToShortlist(id, input) {
    await sleep(400);
    return mutate(id, (it) => ({ ...it, base: { ...it.base, status: "returned" }, history: hist(it, "Returned to shortlist", stateLabel(it), "Returned to shortlist", input.reason) }));
  },
};
