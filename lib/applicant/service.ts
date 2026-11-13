"use client";

/**
 * Applicant dashboard: mock data service / adapter layer.
 *
 * Per project-lead/backend-engineer direction (2026-09-28): UI components
 * call these typed async functions, never raw hardcoded data. This mock
 * implementation persists to localStorage (client-only) so the call SHAPE
 * already matches what a real Supabase-backed implementation would need —
 * swapping this module for one that calls Supabase later should not require
 * rebuilding any screen. This file owns presentation-layer mock state only:
 * it does NOT define database schema, RLS policy, persistent authorization,
 * recruitment-progression rules, or server-side state transitions — those
 * are the backend engineer's, not built or assumed here.
 *
 * Draft continuity: a browser that starts an application, signs up, and
 * comes back later (or clicks Apply on the same job again) resumes the SAME
 * draft rather than creating a duplicate — see getOrCreateDraft().
 *
 * SSR safety: this module is imported by client components only. The
 * module-level `state` starts as the deterministic ACTIVE_SEED (same value
 * on server and first client paint, so hydration matches); localStorage is
 * only read after mount, via hydrateFromStorage(), called once from
 * useApplicantStore()'s effect. All mutations are client-only no-ops on the
 * server (guarded by `typeof window`).
 */
import { useEffect, useSyncExternalStore } from "react";
import { fromApplicant } from "@/lib/notifications/adapters";
import type { SharedNotification } from "@/lib/notifications/types";
import { addRequest, markApplied, readRequests, subscribeRequests, withdrawRequest } from "@/lib/bridge/interview-requests";
import { requestBlock } from "@/lib/applicant/interview-state";
import { getSeeds, type MockSeed } from "./mock-db";
import { DOCUMENT_TYPES, PROFILE_CHECKLIST } from "./reference-data";
import type {
  Application,
  ApplicantDocument,
  DocumentTypeKey,
  ApplicantProfile,
  ApplyFormData,
  AppNotification,
  Interview,
  PrototypeMode,
  ProfileCompleteness,
} from "./types";

// v2: seed realigned to the wireframe (Brunch Lane, Sous Chef) - older saved demo state is discarded.
// v3 (2026-09-29): skill categories/sectors renamed to the requirements doc's
// lists, state/LGA now mean state/LGA of ORIGIN, documents gained `docType`
// ("NIN slip" -> "Valid ID"), notifications gained `kind`. Older saved demo
// state would show orphaned skills/sectors, so it is discarded.
const STORAGE_KEY = "beeliv-applicant-mock-v4";

export type MockState = MockSeed & { mode: PrototypeMode };

function seedFor(mode: PrototypeMode): MockSeed {
  // Deep-clone so repeated resets/mode switches never mutate the seed constants.
  const { ACTIVE_SEED, NEW_SEED, PLACED_SEED } = getSeeds();
  return JSON.parse(JSON.stringify(mode === "active" ? ACTIVE_SEED : mode === "placed" ? PLACED_SEED : NEW_SEED));
}

// Wireframe default (`st.mode="active"`) — see mock-db.ts header comment.
let state: MockState = { mode: "active", ...seedFor("active") };
// The state the server rendered with. React hydrates with getServerSnapshot, so the browser must start
// from this and only then switch to the saved (localStorage) state; returning the live state here made
// the first client render differ from the server HTML (hydration mismatch).
const initialState: MockState = state;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function setState(next: MockState) {
  state = next;
  persist();
  notify();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota) — mock state stays in-memory only.
  }
}

function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw) as MockState;
      notify();
    }
  } catch {
    // Corrupt/unavailable storage — keep the in-memory default.
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}
// Server renders always use today's seed (a long-running server would
// otherwise keep the one built when the module first loaded).
let serverState: { day: string; state: MockState } | null = null;
function getServerSnapshot() {
  if (typeof window !== "undefined") return initialState;
  const day = new Date().toDateString();
  if (!serverState || serverState.day !== day) serverState = { day, state: { mode: "active", ...seedFor("active") } };
  return serverState.state;
}

/** Live, reactive read access to the whole mock store. */
export function useApplicantStore(): MockState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateFromStorage();
    drainResubmissionInbox();
    absorbInterviewOutcomes();
    const onStorage = (e: StorageEvent) => {
      if (e.key === RESUBMISSION_INBOX_KEY) drainResubmissionInbox();
    };
    window.addEventListener("storage", onStorage);
    // HR rescheduled or cancelled an interview after the candidate asked (lib/bridge/interview-requests.ts).
    const stopBridge = subscribeRequests(absorbInterviewOutcomes);
    return () => {
      window.removeEventListener("storage", onStorage);
      stopBridge();
    };
  }, []);
  return snapshot;
}

/**
 * MOCK BRIDGE (Admin -> Applicant) for interviews. When HR reschedules or cancels an
 * interview the candidate asked about ("Can't make this time"), the new time or the
 * cancellation lands here and the candidate gets a notification. The real backend
 * does this on the server (interview row + notification row + email).
 */
function absorbInterviewOutcomes() {
  if (typeof window === "undefined") return;
  const todo = readRequests().filter((r) => r.status !== "open" && !r.applied && r.outcome);
  if (todo.length === 0) return;
  let next = state;
  for (const r of todo) {
    const iv = next.interviews.find((v) => v.id === r.interviewRef);
    const o = r.outcome;
    if (!iv || !o) continue;
    if (r.status === "rescheduled" && o.scheduledAt) {
      const when = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })
        .format(new Date(o.scheduledAt))
        .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
      next = {
        ...next,
        interviews: next.interviews.map((v) =>
          v.id === iv.id
            ? { ...v, status: "scheduled", scheduledAt: o.scheduledAt, durationMinutes: o.durationMinutes ?? v.durationMinutes, mode: o.mode ?? v.mode, meetingLink: o.meetingLink, withWhom: o.withWhom ?? v.withWhom }
            : v,
        ),
        notifications: [
          {
            id: `ivchg-${r.id}-${Date.parse(o.decidedAt)}`,
            code: "interview.changed",
            tone: "violet",
            icon: "cal",
            title: "Your interview time has changed",
            detail: `${iv.title} for ${iv.applicationLabel} is now on ${when} (WAT).`,
            createdAt: o.decidedAt,
            unread: true,
            link: { label: "View interview", href: "/applicant/interviews" },
          },
          ...next.notifications,
        ],
      };
    } else if (r.status === "cancelled") {
      next = {
        ...next,
        interviews: next.interviews.map((v) => (v.id === iv.id ? { ...v, status: "cancelled" } : v)),
        notifications: [
          {
            id: `ivcan-${r.id}-${Date.parse(o.decidedAt)}`,
            code: "interview.cancelled",
            tone: "warn",
            icon: "cal",
            title: "Your interview was cancelled",
            detail: `${iv.title} for ${iv.applicationLabel} will not go ahead at the time you were given. Beeliv will contact you if there is a new time.`,
            createdAt: o.decidedAt,
            unread: true,
            link: { label: "View interviews", href: "/applicant/interviews" },
          },
          ...next.notifications,
        ],
      };
    }
  }
  if (next !== state) setState(next);
  // Marked last: each mark fires a change event, and the list above must already be applied by then.
  for (const r of todo) markApplied(r.id);
}

/**
 * "Can't make this time? Message HR". Hands the request to the Admin mock (an Inbox case
 * for HR). It never changes the interview; only HR's reschedule or cancel does.
 * One open request per interview, and none once the interview time has passed.
 */
export type SendCantMakeItResult = { ok: true } | { ok: false; reason: "duplicate"; message: string; note: string; requestedAt: string } | { ok: false; reason: "passed" | "unavailable" };

export function sendCantMakeIt(iv: Interview, reason: string, note: string): SendCantMakeItResult {
  if (!iv.scheduledAt) return { ok: false, reason: "unavailable" };
  const block = requestBlock(iv, readRequests());
  if (block?.kind === "duplicate") return { ok: false, reason: "duplicate", message: block.request.reason, note: block.request.note, requestedAt: block.request.requestedAt };
  if (block?.kind === "passed") return { ok: false, reason: "passed" };
  addRequest({
    interviewRef: iv.id,
    title: iv.title,
    applicationLabel: iv.applicationLabel,
    applicantName: state.profile.fullName,
    applicantEmail: state.profile.email || undefined,
    scheduledAt: iv.scheduledAt,
    durationMinutes: iv.durationMinutes,
    mode: iv.mode,
    withWhom: iv.withWhom,
    meetingLink: iv.meetingLink,
    reason,
    note: note.trim(),
  });
  return { ok: true };
}

/** Takes an open request back. The interview never changed, so it simply shows its original time again; HR's case closes. */
export function withdrawCantMakeIt(requestId: string) {
  withdrawRequest(requestId);
}

/**
 * MOCK BRIDGE (Admin -> Applicant). Admin's mock "Request resubmission" drops
 * {docType, reason, requestedAt} into this localStorage inbox; the Applicant
 * store applies it to the matching document of the demo applicant. The real
 * backend replaces this with a server-side document record.
 */
export const RESUBMISSION_INBOX_KEY = "beeliv-resubmission-inbox-v1";

function drainResubmissionInbox() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RESUBMISSION_INBOX_KEY);
    if (!raw) return;
    window.localStorage.removeItem(RESUBMISSION_INBOX_KEY);
    const items = JSON.parse(raw) as { docType: string; reason: string; requestedAt: string }[];
    let next = state;
    for (const it of items) {
      const want = it.docType.trim().toLowerCase();
      const doc = next.documents.find((d) => d.name.toLowerCase() === want);
      if (!doc || !it.reason.trim()) continue;
      next = {
        ...next,
        documents: next.documents.map((d) =>
          d.id === doc.id ? { ...d, status: "action-required", resubmitted: undefined, resubmission: { reason: it.reason.trim(), requestedAt: it.requestedAt } } : d,
        ),
        notifications: [
          {
            id: `resubmit-${doc.id}-${Date.parse(it.requestedAt)}`,
            kind: "document-request",
            tone: "warn",
            icon: "sign",
            title: `Your ${doc.name.toLowerCase()} needs to be uploaded again`,
            detail: it.reason.trim(),
            createdAt: it.requestedAt,
            unread: true,
            link: { label: "Upload a new file", href: `/applicant/documents#doc-${doc.id}` },
          },
          ...next.notifications,
        ],
      };
    }
    if (next !== state) setState(next);
  } catch {
    // Unreadable inbox — ignore, this is demo-only plumbing.
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Prototype-state toggle                                              */
/* ------------------------------------------------------------------ */

export async function setMode(mode: PrototypeMode): Promise<void> {
  if (mode === state.mode) return;
  setState({ mode, ...seedFor(mode) });
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function getProfile(): Promise<ApplicantProfile> {
  return state.profile;
}

export async function saveProfile(partial: Partial<ApplicantProfile>): Promise<ApplicantProfile> {
  const profile = { ...state.profile, ...partial };
  setState({ ...state, profile });
  return profile;
}

/** Real, computed completeness — not a hardcoded percentage. */
export function computeProfileCompleteness(
  profile: ApplicantProfile,
  documents: ApplicantDocument[],
): ProfileCompleteness {
  const hasDoc = (name: string) => documents.some((d) => d.name === name && d.status !== "action-required");
  const checks: Record<string, boolean> = {
    professionalSummary: Boolean(profile.professionalSummary),
    certifications: profile.certifications.length > 0,
    employmentHistory: profile.employmentHistory.length > 0,
    skills: Object.values(profile.skills).some((s) => s.length > 0),
    emergencyContact: Boolean(profile.emergencyContact.name),
    cv: hasDoc("CV"),
    passportPhoto: hasDoc("Passport photograph"),
    preferences: Boolean(profile.availability) && profile.preferredLocations.length > 0,
  };
  const missingItems = PROFILE_CHECKLIST.filter((item) => !checks[item.key]);
  const missing = missingItems.map((item) => item.label);
  const percent = 100 - missingItems.reduce((sum, item) => sum + item.weight, 0);
  const shorts = missingItems.map((item) => item.short);
  const summary = shorts.length
    ? `${shorts.length} thing${shorts.length === 1 ? "" : "s"} left: ${shorts.length === 1 ? shorts[0] : `${shorts.slice(0, -1).join(", ")} and ${shorts[shorts.length - 1]}`}.`
    : "Your profile is complete.";
  const items = PROFILE_CHECKLIST.map((item) => ({ label: item.label, done: Boolean(checks[item.key]) }));
  return { percent, missing, items, summary };
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export async function listApplications(): Promise<Application[]> {
  return state.applications;
}

export async function getApplication(id: string): Promise<Application | null> {
  return state.applications.find((a) => a.id === id) ?? null;
}

export function getApplicationSync(id: string): Application | null {
  return state.applications.find((a) => a.id === id) ?? null;
}

export function getDraftForVacancy(vacancyId: string): Application | null {
  return state.applications.find((a) => a.vacancyId === vacancyId && a.lifecycle === "draft") ?? null;
}

export function hasSubmittedForVacancy(vacancyId: string): boolean {
  return state.applications.some((a) => a.vacancyId === vacancyId && a.lifecycle !== "draft");
}

function blankForm(profile: ApplicantProfile): ApplyFormData {
  return {
    fullName: profile.fullName,
    preferredName: profile.preferredName,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.email,
    yearsExperience: "",
    expectedSalary: profile.expectedSalary,
    availability: profile.availability,
    earliestStart: "",
    preferredLocation: profile.preferredLocations[0] ?? "",
    willingShifts: profile.willingShifts ? "Yes" : "No",
    willingWeekends: profile.willingWeekendsHolidays ? "Yes" : "No",
    willingHolidays: profile.willingWeekendsHolidays ? "Yes" : "No",
    sectors: [],
    skills: profile.skills,
    roleCertificateFileName: null,
    screeningQ1: "",
    screeningQ2: "",
    screeningQ3: "",
  };
}

export type JobSnapshot = { role: string; company: string; location: string; employmentType: string };

/**
 * Draft continuity: returns the existing draft for this vacancy if one
 * exists, otherwise creates one. Idempotent by design — clicking Apply
 * twice, or signing up then landing here, never creates a duplicate draft.
 */
export async function getOrCreateDraft(vacancyId: string, job: JobSnapshot): Promise<Application> {
  const existing = getDraftForVacancy(vacancyId);
  if (existing) return existing;

  const draft: Application = {
    id: `draft-${vacancyId}-${Date.now()}`,
    applicantId: state.profile.id,
    vacancyId,
    role: job.role,
    company: job.company,
    location: job.location,
    employmentType: job.employmentType,
    lifecycle: "draft",
    stage: -1,
    stageDates: [],
    submittedAt: null,
    updatedAt: nowIso(),
    draftPercent: 0,
    form: blankForm(state.profile),
    next: {
      label: "Continue your application",
      detail: "Step 1 of 6",
      ctaLabel: "Continue application",
      href: `/applicant/apply?job=${vacancyId}`,
    },
    activity: [{ title: "Draft started", when: nowIso() }],
  };
  setState({ ...state, applications: [draft, ...state.applications] });
  return draft;
}

/** API-shape alias per the requested adapter surface. */
export async function startApplication(vacancyId: string, job: JobSnapshot): Promise<Application> {
  return getOrCreateDraft(vacancyId, job);
}
/** API-shape alias per the requested adapter surface. */
export async function resumeApplication(applicationId: string): Promise<Application | null> {
  return getApplication(applicationId);
}

export async function saveApplicationStep(
  applicationId: string,
  stepIndex: number,
  data: Partial<ApplyFormData>,
): Promise<Application | null> {
  const app = getApplicationSync(applicationId);
  if (!app) return null;
  const totalSteps = 6;
  const updated: Application = {
    ...app,
    form: { ...app.form, ...data },
    draftPercent: Math.min(95, Math.round(((stepIndex + 1) / totalSteps) * 100)),
    updatedAt: nowIso(),
  };
  setState({
    ...state,
    applications: state.applications.map((a) => (a.id === applicationId ? updated : a)),
  });
  return updated;
}

export async function submitApplication(applicationId: string): Promise<Application | null> {
  const app = getApplicationSync(applicationId);
  if (!app) return null;
  const updated: Application = {
    ...app,
    lifecycle: "submitted",
    stage: 0,
    stageDates: [nowIso(), null, null, null, null, null, null, null],
    submittedAt: nowIso(),
    updatedAt: nowIso(),
    draftPercent: undefined,
    next: null,
    activity: [{ title: "Application submitted", when: nowIso() }, ...app.activity],
  };
  setState({
    ...state,
    applications: state.applications.map((a) => (a.id === applicationId ? updated : a)),
  });
  return updated;
}

/* ------------------------------------------------------------------ */
/* Interviews                                                          */
/* ------------------------------------------------------------------ */

export async function listInterviews(): Promise<import("./types").Interview[]> {
  return state.interviews;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export async function listDocuments(): Promise<ApplicantDocument[]> {
  return state.documents;
}

/** "Use existing CV ✓" pattern — marks a stored document as attached to an application rather than re-uploading it. */
export async function attachExistingDocument(documentId: string, applicationId: string): Promise<void> {
  setState({
    ...state,
    documents: state.documents.map((d) =>
      d.id === documentId && !d.usedInApplicationIds.includes(applicationId)
        ? { ...d, usedInApplicationIds: [...d.usedInApplicationIds, applicationId] }
        : d,
    ),
  });
}

/** New application-stage document upload (e.g. a role-specific certificate). Mock only — no real file storage. */
export async function uploadApplicationDocument(input: {
  name: string;
  fileName: string;
  /** Display size such as "214 KB" (demo file store); null when unknown. */
  size?: string | null;
  /** Optional pre-chosen id so a demo file can be stored under it before the record exists. */
  id?: string;
  applicationId?: string;
  docType?: DocumentTypeKey;
}): Promise<ApplicantDocument> {
  const doc: ApplicantDocument = {
    id: input.id ?? `doc-${Date.now()}`,
    ownerId: state.profile.id,
    category: "application",
    docType: input.docType,
    name: input.name,
    fileName: input.fileName,
    size: input.size ?? null,
    uploadedOn: nowIso(),
    status: "pending-review",
    usedInApplicationIds: input.applicationId ? [input.applicationId] : [],
  };
  setState({ ...state, documents: [...state.documents, doc] });
  return doc;
}

/**
 * Documents page "Add document": the applicant adds one of the optional
 * Module 1 §3 types themselves (DOCUMENT_TYPES[].selfAdd). The record takes
 * the type's own category, so e.g. "Other supporting documents" uses the
 * pre-employment wording (Submitted / Verified). Mock only — no file storage.
 */
export async function addOptionalDocument(docType: DocumentTypeKey, fileName: string, size: string | null = null, id?: string): Promise<ApplicantDocument | null> {
  const type = DOCUMENT_TYPES.find((t) => t.key === docType && t.selfAdd);
  if (!type) return null;
  const doc: ApplicantDocument = {
    id: id ?? `doc-${docType}-${Date.now()}`,
    ownerId: state.profile.id,
    category: type.category,
    docType,
    name: type.label,
    fileName,
    size,
    uploadedOn: nowIso(),
    status: "pending-review",
    usedInApplicationIds: [],
  };
  setState({ ...state, documents: [...state.documents, doc] });
  return doc;
}

/** Fulfils a requested pre-employment document (guarantor form / references) — see docs/BEELIV-APPLICANT-JOURNEY.md §4. */
export async function fulfilPreEmploymentDocument(documentId: string, fileName: string, size?: string | null): Promise<void> {
  setState({
    ...state,
    documents: state.documents.map((d) =>
      d.id === documentId
        ? { ...d, status: "pending-review", fileName, ...(size !== undefined ? { size } : {}), uploadedOn: nowIso(), ...(d.resubmission ? { resubmitted: true, resubmission: undefined } : {}) }
        : d,
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Offer → placement → staff access (locked transition, 2026-09-29)    */
/* In production these are backend state changes; the applicant only  */
/* accepts/declines. confirmPlacement() is a PROTOTYPE simulation of   */
/* Beeliv confirming placement and activating staff access.            */
/* ------------------------------------------------------------------ */

function patchApp(id: string, fn: (a: Application) => Application) {
  setState({ ...state, applications: state.applications.map((a) => (a.id === id ? fn(a) : a)) });
}

/**
 * The applicant submitted the Documentation form (components/applicant/documentation). One place derives the rest, so
 * every screen agrees: the application moves to Verification with a calm "submitted, being verified" next step, the
 * pre-employment documents Beeliv asked for go to "pending review", and the matching requests leave the notification
 * list (a confirmation is added). Mock only; in production the server does this when the form is submitted.
 */
export async function markDocumentationSubmitted(applicationId: string): Promise<void> {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app || app.lifecycle !== "submitted") return;
  const now = nowIso();
  const stageDates = [...app.stageDates];
  const moveOn = app.stage <= 3;
  if (moveOn) stageDates[3] = stageDates[3] ?? now;
  if (moveOn) stageDates[4] = now;
  const documents = state.documents.map((d) =>
    d.category === "pre-employment" && d.forApplicationId === applicationId && d.status === "action-required"
      ? { ...d, status: "pending-review" as const, uploadedOn: d.uploadedOn ?? now, ...(d.resubmission ? { resubmitted: true, resubmission: undefined } : {}) }
      : d,
  );
  const stillOwed = documents.some((d) => d.status === "action-required");
  const notifications = state.notifications.filter((n) => !((n.kind === "document-request" || n.kind === "documentation-reminder") && (n.detail.includes(app.company) || !stillOwed)));
  setState({
    ...state,
    documents,
    notifications: [
      {
        id: `docs-submitted-${applicationId}`,
        kind: "documentation-reminder",
        tone: "ok",
        icon: "spark",
        title: "Documentation submitted",
        detail: `Beeliv is verifying your documentation for ${app.role} at ${app.company}. We will tell you if anything else is needed.`,
        createdAt: now,
        unread: true,
        link: { label: "View application", href: `/applicant/applications/${applicationId}` },
      },
      ...notifications,
    ],
    applications: state.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            stage: moveOn ? 4 : a.stage,
            stageDates,
            updatedAt: now,
            next: { label: "Documentation submitted", detail: "Beeliv is verifying your documentation. We will tell you if anything else is needed.", ctaLabel: "View application", href: `/applicant/applications/${applicationId}`, tone: "info" },
            activity: [{ title: "Documentation submitted", detail: "Beeliv is verifying it", when: now }, ...a.activity],
          }
        : a,
    ),
  });
}

export async function acceptOffer(applicationId: string): Promise<void> {
  const now = nowIso();
  patchApp(applicationId, (a) => {
    if (!a.offer || a.offer.status !== "pending") return a;
    const stageDates = [...a.stageDates];
    stageDates[6] = now;
    return {
      ...a,
      stage: 6,
      stageDates,
      updatedAt: now,
      offer: { ...a.offer, status: "accepted", respondedAt: now },
      next: {
        label: "Onboarding in progress",
        detail: `Review your accepted offer and the next steps for ${a.offer.outlet}.`,
        ctaLabel: "View progress",
        href: `/applicant/applications/${a.id}`,
        tone: "info",
      },
      activity: [{ title: "Offer accepted", detail: `${a.offer.role} · ${a.offer.outlet}`, when: now }, ...a.activity],
    };
  });
}

export async function declineOffer(applicationId: string, reason: string): Promise<void> {
  const now = nowIso();
  patchApp(applicationId, (a) => {
    if (!a.offer || a.offer.status !== "pending") return a;
    return {
      ...a,
      lifecycle: "withdrawn",
      updatedAt: now,
      offer: { ...a.offer, status: "declined", respondedAt: now, declineReason: reason || undefined },
      next: null,
      activity: [{ title: "Offer declined", detail: reason || undefined, when: now }, ...a.activity],
    };
  });
}

/** PROTOTYPE ONLY — stands in for Beeliv confirming placement (backend). */
export async function confirmPlacement(applicationId: string): Promise<void> {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app?.offer || app.offer.status !== "accepted") return;
  const now = nowIso();
  const offer = app.offer;
  const stageDates = [...app.stageDates];
  stageDates[7] = now;
  setState({
    ...state,
    profile: {
      ...state.profile,
      staffEntitlement: { granted: true, grantedAt: now, outletName: offer.outlet, role: offer.role, resumptionDate: offer.resumptionDate },
    },
    applications: state.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            stage: 7,
            lifecycle: "completed",
            stageDates,
            updatedAt: now,
            next: {
              label: "Your Staff Hub is ready",
              detail: "Staff access is now on your account. Follow the short setup to start using the Staff Hub.",
              ctaLabel: "Set up Staff Hub",
              href: "/applicant/staff-access",
              tone: "ok",
            },
            activity: [
              { title: "Staff access activated", detail: "Staff Hub · talent.beeliv.co", when: now },
              { title: "Placement confirmed", detail: `${offer.role} · ${offer.outlet}`, when: now },
              ...a.activity,
            ],
          }
        : a,
    ),
    notifications: [
      {
        id: `staff-ready-${applicationId}`,
        kind: "placement",
        tone: "ok",
        icon: "spark",
        title: "Your Staff Hub is ready",
        detail: `You're on the team at ${offer.outlet}. Staff access has been added to your account.`,
        createdAt: now,
        unread: true,
        link: { label: "Set up Staff Hub", href: "/applicant/staff-access" },
      },
      {
        id: `resumption-${applicationId}`,
        kind: "resumption-date",
        tone: "info",
        icon: "cal",
        title: "Your resumption date",
        detail: `You start at ${offer.outlet} on ${new Date(offer.resumptionDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}.`,
        createdAt: now,
        unread: true,
      },
      ...state.notifications,
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function listNotifications(): Promise<AppNotification[]> {
  return state.notifications;
}

/** The same notifications in the shared shape (lib/notifications/types.ts), through the small adapter. */
export async function listSharedNotifications(): Promise<SharedNotification[]> {
  return state.notifications.map(fromApplicant);
}

export async function markNotificationRead(id: string): Promise<void> {
  setState({
    ...state,
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
  });
}

export async function deleteNotification(id: string): Promise<void> {
  setState({ ...state, notifications: state.notifications.filter((n) => n.id !== id) });
}

export async function markAllNotificationsRead(): Promise<void> {
  setState({ ...state, notifications: state.notifications.map((n) => ({ ...n, unread: false })) });
}

export function unreadNotificationsCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => n.unread).length;
}

/* ------------------------------------------------------------------ */
/* Apply flow: document replace (appended for the Apply Documents step) */
/* ------------------------------------------------------------------ */

/**
 * "Replace" on a stored application document (Apply > Documents step):
 * swaps the file on the SAME document record instead of creating a
 * duplicate, and sends it back to review. Mock only — no real file storage;
 * `size` is cleared because the mock never reads the real file.
 */
export async function replaceDocumentFile(documentId: string, fileName: string, size: string | null = null): Promise<void> {
  setState({
    ...state,
    documents: state.documents.map((d) =>
      d.id === documentId ? { ...d, fileName, size, status: "pending-review", uploadedOn: nowIso() } : d,
    ),
  });
}
