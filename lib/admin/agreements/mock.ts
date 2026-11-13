/**
 * DEV FIXTURE for Agreements and policies. NO LEGAL WORDING: every document starts with
 * no published version and an empty draft; the only text is what the user types. The one
 * exception is the dev-only `?demo=agreements-sample` (server-decided, see lib/dev-demo.ts):
 * it seeds a clearly labelled layout sample so a populated state can be reviewed. That sample
 * is not Beeliv wording and is never used otherwise.
 *
 * Memory only: reloading the page forgets drafts and publishes. Hash here is a real SHA-256
 * of the body so the displayed value behaves like the server one (the server stays the
 * authority). Replace with a Supabase adapter implementing AgreementsAdapter.
 *
 * Previews: ?state=restricted (403), ?state=conflict (the first save or publish is refused),
 * and the shell's "Prototype state" control (loading / empty / error).
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode } from "../dev-controls";
import { getDemo } from "@/lib/dev-demo";
import { ConflictError } from "../ops/adapter";
import type { ActivityEvent } from "../ops/activity-types";
import { AGREEMENT_IDS } from "./ids";
import { canDo } from "../role-access";
import { recordMockPublish } from "@/lib/reaccept/store";
import { nextVersion } from "./version";
import type { AgreementsAdapter } from "./adapter";
import {
  AgreementValidationError,
  type AgreementDetail,
  type AgreementDocId,
  type AgreementDocSummary,
  type AgreementVersion,
  type PublicDocument,
  type PublishedAgreement,
  type PublishInput,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));

const ME = "Adaeze Sample (Head of Operations)";
const SAMPLE_BODY = "LAYOUT SAMPLE ONLY. This is not Beeliv wording and has no legal meaning. It exists so a published page can be reviewed. Beeliv supplies the real text.";

interface Doc {
  summary: Omit<AgreementDocSummary, "currentVersion" | "publishedAt" | "hasDraft">;
  draft: { body: string; revision: number; updatedAt: string | null; updatedBy: string | null };
  /** Newest first. */
  versions: AgreementVersion[];
}

const META: Record<AgreementDocId, Doc["summary"]> = {
  "staff-welfare": { id: "staff-welfare", title: "Staff Welfare, HR & Workplace Policy Standard", code: "BH-HR-001", group: "accept", audience: "Staff", acceptanceCount: null },
  "data-protection": { id: "data-protection", title: "Data protection and confidentiality", code: null, group: "accept", audience: "Staff and HR", acceptanceCount: null },
  "client-terms": { id: "client-terms", title: "Client terms", code: null, group: "accept", audience: "Clients", acceptanceCount: null },
  privacy: { id: "privacy", title: "Privacy Policy", code: null, group: "public", audience: null, acceptanceCount: null },
  terms: { id: "terms", title: "Terms of Use", code: null, group: "public", audience: null, acceptanceCount: null },
};
const AGREEMENT_ORDER = AGREEMENT_IDS;

const store = {} as Record<AgreementDocId, Doc>;
const events: ActivityEvent[] = [];
let seeded = false;
let conflictSpent = false;

function init() {
  if (seeded) return;
  seeded = true;
  for (const id of AGREEMENT_ORDER) store[id] = { summary: { ...META[id] }, draft: { body: "", revision: 1, updatedAt: null, updatedBy: null }, versions: [] };
  if (getDemo() === "agreements-sample") {
    AGREEMENT_ORDER.forEach((id, i) => {
      store[id].versions = [{ version: "v1.0", publishedAt: isoOffset(-20 + i, 10, 0), publishedBy: ME, changeNote: "Layout sample.", reaccept: true, bodyHash: "sample", body: SAMPLE_BODY }];
      if (store[id].summary.group === "accept") store[id].summary.acceptanceCount = 4 + i * 3;
    });
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (urlState() === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(250);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
}

function opsOnly() {
  if (!canDo("agreements.publish")) throw new RestrictedError();
}

function summaryOf(d: Doc): AgreementDocSummary {
  const cur = d.versions[0];
  const baseline = cur?.body ?? "";
  return { ...d.summary, currentVersion: cur?.version ?? null, publishedAt: cur?.publishedAt ?? null, hasDraft: d.draft.body.trim() !== "" && d.draft.body !== baseline };
}
const detailOf = (d: Doc): AgreementDetail => ({ summary: summaryOf(d), draft: { ...d.draft }, versions: [...d.versions] });

/** For the Setup checklist: how many of the five documents have a published version. */
export function agreementsPublishedCount(): { published: number; total: number } {
  init();
  return { published: AGREEMENT_ORDER.filter((id) => store[id].versions.length > 0).length, total: AGREEMENT_ORDER.length };
}

/** Publish events for the Activity screen (mock; the server records the real ones). */
export const getAgreementEvents = (): ActivityEvent[] => events;

export const mockAgreementsAdapter: AgreementsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listDocuments() {
    await gate();
    init();
    opsOnly();
    return AGREEMENT_ORDER.map((id) => summaryOf(store[id]));
  },

  async getDocument(id) {
    await gate();
    init();
    opsOnly();
    return detailOf(store[id]);
  },

  async saveDraft(id, body, expectedRevision) {
    await gate();
    init();
    opsOnly();
    const d = store[id];
    if (urlState() === "conflict" && !conflictSpent) {
      conflictSpent = true;
      throw new ConflictError();
    }
    if (d.draft.revision !== expectedRevision) throw new ConflictError();
    d.draft = { body, revision: d.draft.revision + 1, updatedAt: new Date().toISOString(), updatedBy: ME };
    return detailOf(d);
  },

  async publish(id, input: PublishInput) {
    await gate();
    init();
    opsOnly();
    const d = store[id];
    if (urlState() === "conflict" && !conflictSpent) {
      conflictSpent = true;
      throw new ConflictError();
    }
    if (d.draft.revision !== input.expectedRevision) throw new ConflictError();
    const fields: Record<string, string> = {};
    if (!d.draft.body.trim()) fields.body = "Write the text first. An empty draft cannot be published.";
    if (!input.changeNote.trim()) fields.changeNote = "Add a short note about what changed.";
    if (Object.keys(fields).length) throw new AgreementValidationError(fields);
    const version = nextVersion(d.versions[0]?.version ?? null, input.size);
    const body = d.draft.body;
    // Published versions are never edited: a new object is prepended.
    d.versions = [{ version, publishedAt: new Date().toISOString(), publishedBy: ME, changeNote: input.changeNote.trim(), reaccept: d.versions.length ? input.reaccept : true, bodyHash: await sha256(body), body }, ...d.versions];
    d.draft = { ...d.draft, revision: d.draft.revision + 1 };
    if (d.summary.group === "accept") d.summary.acceptanceCount = 0;
    // Preview only: the mock users see the re-acceptance gate in this browser (no-op unless the demo flag is on).
    recordMockPublish({ docId: id, title: d.summary.title, version, changeNote: input.changeNote.trim(), body, publishedAt: d.versions[0].publishedAt, reaccept: d.versions[0].reaccept });
    events.unshift({
      id: `agr-evt-${events.length + 1}`,
      reference: `BLV-AUD-PLACEHOLDER-AGR-${events.length + 1}`,
      at: new Date().toISOString(),
      actorId: "ops-user-1",
      actorName: "Adaeze Sample",
      actorRole: "Head of Operations",
      action: "published",
      entityType: "agreement",
      entityLabel: `${d.summary.title} ${version}`,
      entityHref: `/admin/ops/setup/agreements/${id}`,
      before: d.versions[1] ? d.versions[1].version : "Not published",
      after: version,
      note: input.changeNote.trim(),
      sensitive: false,
    });
    return detailOf(d);
  },

  async listPublished(): Promise<PublishedAgreement[]> {
    await gate();
    init();
    // Published text only: no draft, no draft flag, no older versions.
    return AGREEMENT_ORDER.map((id) => ({ summary: { ...summaryOf(store[id]), hasDraft: false }, current: store[id].versions[0] ?? null }));
  },

  async getPublicDocument(id): Promise<PublicDocument | null> {
    init();
    const v = store[id].versions[0];
    return v ? { title: store[id].summary.title, version: v.version, effectiveAt: v.publishedAt, body: v.body } : null;
  },
};
