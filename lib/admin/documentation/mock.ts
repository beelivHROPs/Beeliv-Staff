/**
 * DEV FIXTURE for Documentation. Everything is FICTIONAL ("Sample" people). The
 * `BLV-...-PLACEHOLDER-n` references stand in for server-generated values. The
 * rules below (which action is allowed in which status, what status an action
 * leads to, who is auto-assigned) are PROVISIONAL mock behaviour so the UI can
 * be exercised; the spec does not define them and the backend owns them.
 * There is no file storage: versions carry metadata only. Sensitive values are
 * stored here ALREADY MASKED, exactly as a real adapter must return them.
 * Replace with a Supabase adapter implementing DocumentationAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import { cmpIso, cmpText } from "../sort";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { textInScope } from "../scope";
import type { DocumentationAdapter } from "./adapter";
import type { DocumentCapabilities, DocumentHistoryEntry, DocumentOwner, DocumentQuery, DocumentQueuePage, DocumentRecord, DocumentStage, DocumentStatus, DocumentTab, DocumentVersion } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

/**
 * MOCK BRIDGE to the Applicant mock (see RESUBMISSION_INBOX_KEY in
 * lib/applicant/service.ts). Only the reason and date cross over, never notes,
 * reviewer names or history. Replaced by the real backend.
 */
function shareWithApplicantMock(docType: string, reason: string) {
  if (typeof window === "undefined") return;
  try {
    const key = "beeliv-resubmission-inbox-v1";
    const items = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    items.push({ docType, reason, requestedAt: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage unavailable: the mock bridge is simply skipped.
  }
}

const ME = "Funke Sample";
const OTHER = "Kelechi Sample";

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  "needs-review": "Needs review",
  missing: "Missing",
  "resubmission-required": "Resubmission required",
  resubmitted: "Resubmitted",
  verified: "Verified",
};

const ACTION_BY_STATUS: Record<DocumentStatus, string> = {
  "needs-review": "HR to review and verify",
  missing: "Waiting for the person to upload",
  "resubmission-required": "Waiting for a new upload",
  resubmitted: "HR to review the new version",
  verified: "None",
};

/** Owners. Applicant ids match the Applicants fixture so Applicant 360 links resolve. */
const OWNERS: Record<string, DocumentOwner & { vacancy: string; context: string; appRef: string }> = {
  "a-001": { id: "a-001", kind: "applicant", name: "Ada Sample", reference: "BLV-APP-PLACEHOLDER-1", appRef: "BLV-APL-PLACEHOLDER-1", vacancy: "Waiter / Waitress", context: "Waiter / Waitress, Demo Hotel Abuja" },
  "a-002": { id: "a-002", kind: "applicant", name: "Tunde Sample", reference: "BLV-APP-PLACEHOLDER-2", appRef: "BLV-APL-PLACEHOLDER-2", vacancy: "Commis Chef", context: "Commis Chef, Demo Lounge Lagos" },
  "a-003": { id: "a-003", kind: "applicant", name: "Chidi Sample", reference: "BLV-APP-PLACEHOLDER-3", appRef: "BLV-APL-PLACEHOLDER-3", vacancy: "Bar Attendant", context: "Bar Attendant, Demo Lounge Lagos" },
  "a-004": { id: "a-004", kind: "applicant", name: "Bisi Sample", reference: "BLV-APP-PLACEHOLDER-4", appRef: "BLV-APL-PLACEHOLDER-4", vacancy: "Waiter / Waitress", context: "Waiter / Waitress, Demo Hotel Abuja" },
  "a-005": { id: "a-005", kind: "applicant", name: "Ngozi Sample", reference: "BLV-APP-PLACEHOLDER-5", appRef: "BLV-APL-PLACEHOLDER-5", vacancy: "Front Desk Officer", context: "Front Desk Officer, Demo Hotel Abuja" },
  "a-006": { id: "a-006", kind: "applicant", name: "Emeka Sample", reference: "BLV-APP-PLACEHOLDER-6", appRef: "BLV-APL-PLACEHOLDER-6", vacancy: "Floor Supervisor", context: "Floor Supervisor, Demo Hotel Abuja" },
  "s-001": { id: "s-001", kind: "staff", name: "Hauwa Sample", reference: "BLV-STF-PLACEHOLDER-1", appRef: "BLV-STF-PLACEHOLDER-1", vacancy: "Staff: Demo Hotel Abuja", context: "Staff, Demo Hotel Abuja (Floor / Service)" },
  "s-002": { id: "s-002", kind: "staff", name: "Dayo Sample", reference: "BLV-STF-PLACEHOLDER-2", appRef: "BLV-STF-PLACEHOLDER-2", vacancy: "Staff: Demo Lounge Lagos", context: "Staff, Demo Lounge Lagos (Bar)" },
};

type Seed = {
  owner: string;
  type: string;
  stage: DocumentStage;
  status: DocumentStatus;
  /** Days since upload; null = never uploaded. */
  ago: number | null;
  reviewer: string | null;
  note?: string;
  sensitive?: { label: string; masked: string };
  /** Pre-existing second version (shows version history). */
  v2?: boolean;
  by?: string;
};

const SEEDS: Seed[] = [
  { owner: "a-001", type: "Guarantor form", stage: "pre-employment", status: "resubmitted", ago: 0, reviewer: ME, v2: true, note: "The first copy was missing the guarantor's signature." },
  { owner: "a-002", type: "CV", stage: "application", status: "needs-review", ago: 1, reviewer: null },
  { owner: "a-003", type: "Reference letter", stage: "pre-employment", status: "missing", ago: null, reviewer: ME },
  { owner: "a-004", type: "Passport photograph", stage: "application", status: "needs-review", ago: 2, reviewer: null },
  { owner: "a-001", type: "Identity document", stage: "application", status: "needs-review", ago: 3, reviewer: OTHER, sensitive: { label: "NIN", masked: "NIN ending 4821" } },
  { owner: "a-002", type: "Identity document", stage: "application", status: "verified", ago: 6, reviewer: ME, sensitive: { label: "NIN", masked: "NIN ending 0937" } },
  { owner: "a-003", type: "CV", stage: "application", status: "verified", ago: 14, reviewer: ME },
  { owner: "a-003", type: "Guarantor form", stage: "pre-employment", status: "needs-review", ago: 1, reviewer: ME },
  { owner: "a-005", type: "Educational certificate", stage: "application", status: "resubmission-required", ago: 5, reviewer: OTHER, note: "The scan is cut off at the bottom. Please upload the full page." },
  { owner: "a-005", type: "CV", stage: "application", status: "verified", ago: 8, reviewer: OTHER },
  { owner: "a-006", type: "Medical/Fitness document", stage: "pre-employment", status: "missing", ago: null, reviewer: null },
  { owner: "a-006", type: "Reference letter", stage: "pre-employment", status: "verified", ago: 10, reviewer: ME },
  { owner: "a-004", type: "CV", stage: "application", status: "needs-review", ago: 2, reviewer: null },
  { owner: "s-001", type: "Bank account details", stage: "pre-employment", status: "needs-review", ago: 1, reviewer: null, sensitive: { label: "Bank account", masked: "Account ending 6054" }, by: "Hauwa Sample" },
  { owner: "s-001", type: "Medical/Fitness document", stage: "pre-employment", status: "missing", ago: null, reviewer: ME },
  { owner: "s-002", type: "Identity document", stage: "pre-employment", status: "verified", ago: 20, reviewer: OTHER, sensitive: { label: "NIN", masked: "NIN ending 1175" }, by: "Dayo Sample" },
  { owner: "s-002", type: "Guarantor form", stage: "pre-employment", status: "resubmitted", ago: 0, reviewer: null, note: "Guarantor phone number was unreadable.", by: "Dayo Sample" },
  { owner: "a-002", type: "Educational certificate", stage: "application", status: "missing", ago: null, reviewer: null },
];

const FILE: Record<string, { ext: string; mime: string; size: number }> = {
  CV: { ext: "pdf", mime: "application/pdf", size: 184_320 },
  "Passport photograph": { ext: "jpg", mime: "image/jpeg", size: 412_000 },
  "Identity document": { ext: "pdf", mime: "application/pdf", size: 256_000 },
  "Bank account details": { ext: "pdf", mime: "application/pdf", size: 98_000 },
};
const fileOf = (type: string) => FILE[type] ?? { ext: "pdf", mime: "application/pdf", size: 140_000 };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function caps(status: DocumentStatus, hasFile: boolean): DocumentCapabilities {
  const reviewable = hasFile && (status === "needs-review" || status === "resubmitted");
  return {
    canVerify: reviewable, // HR; Officer vs Manager difference needs Beeliv confirmation
    canRequestResubmission: reviewable,
    canReplace: status !== "verified",
    canSecureOpen: false, // logged action, not available in the demo
  };
}

function build(s: Seed, i: number): DocumentRecord {
  const o = OWNERS[s.owner];
  const id = `doc-${String(i + 1).padStart(3, "0")}`;
  const hasFile = s.ago !== null;
  const f = fileOf(s.type);
  const uploadedBy = s.by ?? o.name;
  const uploadedAt = hasFile ? isoOffset(-(s.ago as number), 10, 15) : null;
  const versions: DocumentVersion[] = [];
  const history: DocumentHistoryEntry[] = [];
  if (s.v2) {
    versions.push({ version: 1, filename: `${slug(s.type)}-v1.${f.ext}`, mime: f.mime, sizeBytes: f.size - 20_000, uploadedAt: isoOffset(-4, 9, 30), uploadedBy, current: false });
    history.push({ id: `${id}-h1`, at: isoOffset(-4, 9, 30), actor: uploadedBy, action: "Uploaded", previous: "Missing", next: "Needs review" });
    history.push({ id: `${id}-h2`, at: isoOffset(-3, 14, 0), actor: ME, action: "Requested resubmission", previous: "Needs review", next: "Resubmission required", note: s.note });
  }
  if (hasFile) {
    versions.push({ version: versions.length + 1, filename: `${slug(s.type)}${s.v2 ? "-v2" : ""}.${f.ext}`, mime: f.mime, sizeBytes: f.size, uploadedAt: uploadedAt as string, uploadedBy, current: true });
    history.push({ id: `${id}-h3`, at: uploadedAt as string, actor: uploadedBy, action: s.v2 ? "Uploaded a new version" : "Uploaded", previous: s.v2 ? "Resubmission required" : "Missing", next: s.v2 ? "Resubmitted" : "Needs review" });
    if (s.status === "resubmission-required") history.push({ id: `${id}-h4`, at: isoOffset(-(s.ago as number) + 1, 11, 0), actor: s.reviewer ?? ME, action: "Requested resubmission", previous: "Needs review", next: "Resubmission required", note: s.note });
    if (s.status === "verified") history.push({ id: `${id}-h5`, at: isoOffset(-(s.ago as number) + 1, 11, 0), actor: s.reviewer ?? ME, action: "Verified", previous: "Needs review", next: "Verified" });
  }
  return {
    id,
    owner: { id: o.id, kind: o.kind, name: o.name, reference: o.reference },
    reference: o.appRef,
    docType: s.type,
    stage: s.stage,
    context: o.context,
    vacancy: o.vacancy,
    uploadedAt,
    status: s.status,
    reviewer: s.reviewer,
    requiredAction: ACTION_BY_STATUS[s.status],
    filename: hasFile ? versions[versions.length - 1].filename : null,
    mime: hasFile ? f.mime : null,
    sizeBytes: hasFile ? f.size : null,
    uploader: hasFile ? { name: uploadedBy, source: o.kind === "staff" ? "Staff portal" : "Applicant portal" } : null,
    verifiedBy: s.status === "verified" ? (s.reviewer ?? ME) : null,
    verifiedAt: s.status === "verified" ? isoOffset(-(s.ago as number) + 1, 11, 0) : null,
    note: s.note ?? null,
    versions,
    history,
    sensitive: s.sensitive ?? null,
    capabilities: caps(s.status, hasFile),
  };
}

let docs: DocumentRecord[] = SEEDS.map(build);

const tabOf = (s: DocumentStatus): DocumentTab => (s === "resubmission-required" || s === "resubmitted" ? "resubmission" : s);
const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
const toRow = ({ id, owner, reference, docType, stage, context, vacancy, uploadedAt, status, reviewer, requiredAction }: DocumentRecord) => ({ id, owner, reference, docType, stage, context, vacancy, uploadedAt, status, reviewer, requiredAction });

function queue(q: DocumentQuery): DocumentQueuePage {
  const needle = q.search.trim().toLowerCase();
  const inScope = docs.filter((d) => textInScope(d.context));
  const base = inScope.filter(
    (d) =>
      (!needle || [d.owner.name, d.reference, d.owner.reference, d.docType, d.context].some((s) => s.toLowerCase().includes(needle))) &&
      (!q.docType || d.docType === q.docType) &&
      (!q.vacancy || d.vacancy === q.vacancy) &&
      (!q.reviewer || (q.reviewer === "__none" ? d.reviewer === null : d.reviewer === q.reviewer)),
  );
  const count = (t: DocumentTab) => base.filter((d) => tabOf(d.status) === t).length;
  const tabbed = base
    .filter((d) => tabOf(d.status) === q.tab)
    .sort((a, b) => (q.sort === "oldest" ? cmpIso(a.uploadedAt, b.uploadedAt, "asc") : q.sort === "person" ? cmpText(a.owner.name, b.owner.name) : q.sort === "type" ? cmpText(a.docType, b.docType) : cmpIso(a.uploadedAt, b.uploadedAt, "desc")));
  return {
    rows: tabbed.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map(toRow),
    total: tabbed.length,
    tabCounts: { "needs-review": count("needs-review"), missing: count("missing"), resubmission: count("resubmission"), verified: count("verified") },
    facets: { docTypes: uniq(inScope.map((d) => d.docType)), vacancies: uniq(inScope.map((d) => d.vacancy)), reviewers: uniq(inScope.flatMap((d) => (d.reviewer ? [d.reviewer] : []))) },
    workspaceEmpty: inScope.length === 0,
  };
}

function change(id: string, apply: (d: DocumentRecord) => DocumentRecord): DocumentRecord {
  const found = docs.find((d) => d.id === id);
  if (!found) throw new Error("Unknown document");
  const next = apply(found);
  docs = docs.map((d) => (d.id === id ? next : d));
  return next;
}

let seq = 0;
const entry = (action: string, previous: string | null, next: string | null, note?: string): DocumentHistoryEntry => ({ id: `h-new-${++seq}`, at: new Date().toISOString(), actor: ME, action, previous, next, ...(note ? { note } : {}) });

export const mockDocumentationAdapter: DocumentationAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listDocuments(query) {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(300);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    if (mode === "empty") return { rows: [], total: 0, tabCounts: { "needs-review": 0, missing: 0, resubmission: 0, verified: 0 }, facets: { docTypes: [], vacancies: [], reviewers: [] }, workspaceEmpty: true };
    return queue(query);
  },

  async getDocument(id) {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(250);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    if (mode === "empty") return null;
    // PROTOTYPE scope guard (same rule as the list). The REAL enforcement is server-side (grant + Storage policies + RLS).
    const guard = (d: (typeof docs)[number]) => {
      if (!textInScope(d.context)) throw new RestrictedError();
      return d;
    };
    const direct = docs.find((d) => d.id === id);
    if (direct) return guard(direct);
    // Staff Documents rows use `d-NNN-K` (person NNN, document K). Open the matching sample document.
    const m = /^d-(\d+)-(\d+)$/.exec(id);
    if (!m || docs.length === 0) return null;
    return docs[((Number(m[1]) - 1) * 6 + Number(m[2]) - 1) % docs.length];
  },

  async verify(id) {
    await sleep(350);
    return change(id, (d) => {
      if (!d.capabilities.canVerify) throw new Error("Not allowed");
      return {
        ...d,
        status: "verified",
        reviewer: d.reviewer ?? ME,
        verifiedBy: ME,
        verifiedAt: new Date().toISOString(),
        requiredAction: ACTION_BY_STATUS.verified,
        capabilities: caps("verified", true),
        history: [...d.history, entry("Verified", STATUS_LABEL[d.status], STATUS_LABEL.verified)],
      };
    });
  },

  async requestResubmission(id, input) {
    await sleep(350);
    return change(id, (d) => {
      if (!d.capabilities.canRequestResubmission) throw new Error("Not allowed");
      shareWithApplicantMock(d.docType, input.reason);
      return {
        ...d,
        status: "resubmission-required",
        reviewer: d.reviewer ?? ME,
        note: input.reason,
        requiredAction: ACTION_BY_STATUS["resubmission-required"],
        capabilities: caps("resubmission-required", true),
        history: [...d.history, entry("Requested resubmission", STATUS_LABEL[d.status], STATUS_LABEL["resubmission-required"], input.reason)],
      };
    });
  },

  async replace(id) {
    await sleep(450);
    return change(id, (d) => {
      if (!d.capabilities.canReplace) throw new Error("Not allowed");
      // Demo only: no file is stored. A new version row is recorded with placeholder metadata.
      const f = fileOf(d.docType);
      const n = d.versions.length + 1;
      const filename = `${slug(d.docType)}-v${n}.${f.ext}`;
      const status: DocumentStatus = "needs-review"; // provisional: a replaced file goes back to review
      const when = new Date().toISOString();
      return {
        ...d,
        status,
        filename,
        mime: f.mime,
        sizeBytes: f.size,
        uploadedAt: when,
        uploader: { name: ME, source: "HR, on the person's behalf" },
        verifiedBy: null,
        verifiedAt: null,
        requiredAction: ACTION_BY_STATUS[status],
        capabilities: caps(status, true),
        versions: [...d.versions.map((v) => ({ ...v, current: false })), { version: n, filename, mime: f.mime, sizeBytes: f.size, uploadedAt: when, uploadedBy: ME, current: true }],
        history: [...d.history, entry(d.versions.length ? "Replaced with a new version" : "Uploaded on the person's behalf", STATUS_LABEL[d.status], STATUS_LABEL[status])],
      };
    });
  },
};
