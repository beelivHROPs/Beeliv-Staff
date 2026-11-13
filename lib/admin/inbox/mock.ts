"use client";

/**
 * DEV FIXTURE for the Inbox - all names, organisations and references are
 * FICTIONAL. The `reference` strings stand in for server-generated spec 31.1
 * references: the UI only displays them. Delete this file when the backend
 * adapter exists. Same pattern as lib/client.
 *
 * Routing (spec 31.2) is modelled here: public Contact and Work With Beeliv
 * cases exist in the store but are routed to Operations, so no HR role ever
 * receives them. An HR Officer additionally sees only cases assigned to them.
 */
import { useSyncExternalStore } from "react";
import { isoOffset } from "@/lib/applicant/time";
import { applicantHref } from "@/lib/admin/links";
import { getPrototypeMode } from "@/lib/admin/dev-controls";
import { subscribeAdminIdentity } from "@/lib/admin/ops/identity";
import { textInScope } from "@/lib/admin/scope";
import { canDo } from "@/lib/admin/role-access";
import { RestrictedError } from "@/lib/admin/adapter";
import { readRequests, subscribeRequests } from "@/lib/bridge/interview-requests";
import { bridgedInterviewId } from "@/lib/admin/interviews/mock";
import { NotFoundError, type InboxAdapter } from "./adapter";
import type {
  InterviewRequestInfo,
  ActivityKind,
  InboxActivity,
  InboxAssignee,
  InboxCaseCategory,
  InboxCaseDetail,
  InboxCaseSummary,
  InboxMessage,
  InboxPermissions,
  InboxRole,
  InboxSender,
  EmailDeliveryState,
  MessageDelivery,
  CasePickerItem,
  NeedsHomeItem,
  ReplyRoute,
  InboxStatus,
  RelatedRecord,
} from "./types";

/* ---------- dev role switch ("Viewing as") ---------- */

export type DevInboxRole = InboxRole | "none";
let devRole: DevInboxRole = "hrManager";
const roleListeners = new Set<() => void>();
export const getDevInboxRole = (): DevInboxRole => devRole;
export function setDevInboxRole(next: DevInboxRole) {
  if (next === devRole) return;
  devRole = next;
  roleListeners.forEach((l) => l());
  emit();
}
export function useDevInboxRole(): DevInboxRole {
  return useSyncExternalStore(
    (cb) => {
      roleListeners.add(cb);
      return () => roleListeners.delete(cb);
    },
    getDevInboxRole,
    () => "hrManager",
  );
}

/* ---------- fixtures ---------- */

const MANAGER: InboxAssignee = { id: "u-hr-1", name: "Adaeze Okonkwo" };
const OFFICER: InboxAssignee = { id: "u-hr-2", name: "Tunde Bello" };
const THIRD: InboxAssignee = { id: "u-hr-3", name: "Chidi Nwankwo" };
const ASSIGNEES = [MANAGER, OFFICER, THIRD];
const ME: Record<InboxRole, InboxAssignee> = { hrManager: MANAGER, hrOfficer: OFFICER };

type StoredCategory = InboxCaseCategory | "public-contact" | "work-with-beeliv";
interface Stored extends Omit<InboxCaseDetail, "replyRoute" | "category" | "preview" | "needsAction" | "attachmentCount" | "unreadCount" | "lastFromUs" | "interviewRequest"> {
  category: StoredCategory;
  /** Only for "cant-attend" cases: the candidate request (lib/bridge/interview-requests.ts). */
  requestId?: string;
  /** Spec 31.2 primary queue: only "hr" cases can reach an HR user. */
  routedTo: "hr" | "operations";
}

let seq = 100;
const uid = (p: string) => `${p}-${++seq}`;

function msg(direction: InboxMessage["direction"], authorName: string, body: string, createdAt: string, files: string[] = [], extra: Pick<InboxMessage, "delivery" | "viaEmail"> = {}): InboxMessage {
  return { id: uid("m"), direction, authorName, body, createdAt, attachments: files.map((name) => ({ id: uid("f"), name, sizeLabel: "240 KB" })), ...extra };
}

/** Delivery fixture. canRetry / canCheckStatus are what the SERVER would decide; the UI never infers them. */
function dlv(state: EmailDeliveryState, to: string, updatedAt: string, o: Partial<MessageDelivery> = {}): { delivery: MessageDelivery } {
  return {
    delivery: {
      state,
      to,
      updatedAt,
      attempts: 1,
      canRetry: state === "failed",
      canCheckStatus: state === "unknown",
      ...(state === "unknown" ? { supportRef: "MAIL-7Q4K2" } : {}),
      ...o,
    },
  };
}
function act(kind: ActivityKind, text: string, actorName: string, createdAt: string): InboxActivity {
  return { id: uid("a"), kind, text, actorName, createdAt };
}

interface Seed {
  id: string;
  reference: string;
  subject: string;
  category: StoredCategory;
  status: InboxStatus;
  sender: InboxSender;
  assignedTo: InboxAssignee | null;
  unread: boolean;
  related: RelatedRecord | null;
  messages: InboxMessage[];
  routedTo?: "hr" | "operations";
  notes?: { authorName: string; body: string; createdAt: string }[];
}

function seed(s: Seed): Stored {
  const last = s.messages[s.messages.length - 1];
  const first = s.messages[0];
  return {
    id: s.id,
    reference: s.reference,
    subject: s.subject,
    category: s.category,
    status: s.status,
    sender: s.sender,
    assignedTo: s.assignedTo,
    unread: s.unread,
    related: s.related,
    messages: s.messages,
    notes: (s.notes ?? []).map((n) => ({ id: uid("n"), ...n })),
    createdAt: first.createdAt,
    lastActivityAt: last.createdAt,
    routedTo: s.routedTo ?? "hr",
    activity: [
      act("created", "Case created from the submission", s.sender.name, first.createdAt),
      ...(s.assignedTo ? [act("assigned", `Assigned to ${s.assignedTo.name}`, MANAGER.name, first.createdAt)] : []),
    ],
  };
}

const rel = (kind: RelatedRecord["kind"], id: string, label: string, href: string | null = null): RelatedRecord => ({ kind, id, label, href });

function buildStore(): Stored[] {
  return [
    seed({
      id: "case-01", reference: "BLV-ENQ-000031", subject: "Front-of-house training for 12 staff", category: "training-enquiry", status: "new",
      sender: { name: "Kemi Balogun", kind: "public", organisation: "Sample Terrace Restaurant", email: "kemi@sample-terrace.example" },
      assignedTo: OFFICER, unread: true, related: null,
      messages: [msg("inbound", "Kemi Balogun", "Hello, we are opening a new restaurant in March and would like a front-of-house training programme for 12 people. Could you share the available formats and a rough schedule?", isoOffset(0, 8, 40))],
    }),
    seed({
      id: "case-02", reference: "BLV-SUP-000118", subject: "My schedule shows a shift I cannot work", category: "staff-support", status: "open",
      sender: { name: "Ibrahim Danjuma", kind: "staff" }, assignedTo: OFFICER, unread: true, related: rel("staff", "stf-demo-1", "Ibrahim Danjuma"),
      messages: [
        msg("inbound", "Ibrahim Danjuma", "I am scheduled for Saturday evening but I have a family event. Can the shift be swapped?", isoOffset(-1, 15, 5)),
        msg("outbound", OFFICER.name, "Thanks Ibrahim. I am checking with the outlet and will confirm today.", isoOffset(-1, 15, 40)),
        msg("inbound", "Ibrahim Danjuma", "Thank you, please let me know soon.", isoOffset(0, 7, 55)),
      ],
      notes: [{ authorName: OFFICER.name, body: "Outlet manager is open to a swap if someone covers. Checking the roster.", createdAt: isoOffset(-1, 16, 10) }],
    }),
    seed({
      id: "case-03", reference: "BLV-SUP-000119", subject: "Update the contact person for our outlet", category: "client-support", status: "new",
      sender: { name: "Chiamaka Obi", kind: "client", organisation: "Demo Hotel Abuja", email: "chiamaka@demo-hotel.example" }, assignedTo: null, unread: true, related: rel("client", "cli-demo-1", "Demo Hotel Abuja"),
      messages: [msg("inbound", "Chiamaka Obi", "Our front desk manager has changed. Please update the outlet contact to the new manager. Details attached.", isoOffset(0, 9, 12), ["contact-change.pdf"])],
    }),
    seed({
      id: "case-04", reference: "BLV-WFR-000047", subject: "3 banquet servers for December events", category: "workforce-request", status: "open",
      sender: { name: "Chiamaka Obi", kind: "client", organisation: "Demo Hotel Abuja", email: "chiamaka@demo-hotel.example" }, assignedTo: THIRD, unread: false, related: rel("workforce-request", "wfr-demo-1", "Banquet servers, December"),
      messages: [
        msg("inbound", "Chiamaka Obi", "We need 3 experienced banquet servers from 10 to 24 December.", isoOffset(-2, 11, 0)),
        msg("outbound", THIRD.name, "Received. We are shortlisting and will share candidates by Friday.", isoOffset(-2, 13, 20), [], dlv("delivered", "chiamaka@demo-hotel.example", isoOffset(-2, 13, 21))),
      ],
    }),
    seed({
      id: "case-05", reference: "BLV-SUP-000120", subject: "Feedback on shortlisted candidate", category: "candidate-feedback", status: "waiting-on-sender",
      sender: { name: "Seun Fashola", kind: "client", organisation: "Sample Lounge Wuse", email: "seun@sample-lounge.example" }, assignedTo: OFFICER, unread: false, related: rel("applicant", "applicant-demo-2", "Amaka Nwosu", applicantHref("applicant-demo-2")),
      messages: [
        msg("inbound", "Seun Fashola", "We liked Amaka but would like to see more bar experience. Is a second interview possible?", isoOffset(-3, 10, 0)),
        msg("outbound", OFFICER.name, "Yes. Could you share two time slots that suit your team?", isoOffset(-3, 11, 30), [], dlv("delivered", "seun@sample-lounge.example", isoOffset(-3, 11, 31))),
      ],
    }),
    seed({
      id: "case-06", reference: "BLV-SUP-000121", subject: "Resubmitted reference letter", category: "applicant-documents", status: "open",
      sender: { name: "Amaka Nwosu", kind: "applicant", email: "amaka.n@sample-mail.example" }, assignedTo: MANAGER, unread: true, related: rel("applicant", "applicant-demo-2", "Amaka Nwosu", applicantHref("applicant-demo-2")),
      messages: [msg("inbound", "Amaka Nwosu", "I have uploaded a clearer copy of my reference letter as requested.", isoOffset(0, 6, 30), ["reference-letter.pdf"])],
    }),
    seed({
      id: "case-07", reference: "BLV-SUP-000122", subject: "Cannot sign in on my phone", category: "technical-account", status: "escalated",
      sender: { name: "Ifeoma Chukwu", kind: "staff" }, assignedTo: THIRD, unread: false, related: rel("staff", "stf-demo-2", "Ifeoma Chukwu"),
      messages: [
        msg("inbound", "Ifeoma Chukwu", "The app says my session expired every time I try to log in.", isoOffset(-4, 9, 0)),
        msg("outbound", THIRD.name, "Sorry about that. We have escalated this to the technical team.", isoOffset(-4, 10, 0)),
      ],
    }),
    seed({
      id: "case-08", reference: "BLV-SUP-000117", subject: "Payslip question", category: "staff-support", status: "resolved",
      sender: { name: "Ngozi Eze", kind: "staff" }, assignedTo: OFFICER, unread: false, related: rel("staff", "stf-demo-3", "Ngozi Eze"),
      messages: [
        msg("inbound", "Ngozi Eze", "Where can I see my payment schedule?", isoOffset(-9, 9, 0)),
        msg("outbound", OFFICER.name, "It is under Payroll in your Staff hub. Let us know if anything looks wrong.", isoOffset(-9, 10, 0)),
      ],
    }),
    seed({
      id: "case-09", reference: "BLV-SUP-000123", subject: "Who should receive questions about our placement agreement", category: "client-support", status: "waiting-on-sender",
      sender: { name: "Tolu Adewale", kind: "client", organisation: "Sample Cafe Garki" }, assignedTo: OFFICER, unread: false, related: rel("client", "cli-demo-2", "Sample Cafe Garki"),
      messages: [
        msg("inbound", "Tolu Adewale", "Who should we send questions about the placement agreement to?", isoOffset(-5, 14, 0)),
        msg("outbound", OFFICER.name, "I can help. Which agreement and outlet are you asking about?", isoOffset(-5, 15, 0)),
      ],
    }),
    seed({
      id: "case-10", reference: "BLV-WFR-000048", subject: "Two line cooks needed urgently", category: "workforce-request", status: "new",
      sender: { name: "Seun Fashola", kind: "client", organisation: "Sample Lounge Wuse", email: "seun@sample-lounge.example" }, assignedTo: null, unread: true, related: rel("workforce-request", "wfr-demo-2", "Line cooks"),
      messages: [msg("inbound", "Seun Fashola", "Two of our line cooks have left. We need replacements within two weeks.", isoOffset(0, 9, 40))],
    }),
    seed({
      id: "case-11", reference: "BLV-ENQ-000030", subject: "Barista training for a small team", category: "training-enquiry", status: "resolved",
      sender: { name: "Femi Oyelaran", kind: "public", email: "femi@sample-roasters.example" }, assignedTo: THIRD, unread: false, related: null,
      messages: [
        msg("inbound", "Femi Oyelaran", "Do you run barista courses for teams of four?", isoOffset(-12, 9, 0)),
        msg("outbound", THIRD.name, "Yes, we do. I have sent the course outline to your email.", isoOffset(-12, 12, 0), [], dlv("delivered", "femi@sample-roasters.example", isoOffset(-12, 12, 1))),
      ],
    }),
    seed({
      id: "case-12", reference: "BLV-SUP-000124", subject: "Uploaded the wrong certificate", category: "applicant-documents", status: "new",
      sender: { name: "Kunle Adebayo", kind: "applicant", email: "kunle.a@sample-mail.example" }, assignedTo: null, unread: true, related: rel("applicant", "applicant-demo-3", "Kunle Adebayo", applicantHref("applicant-demo-3")),
      messages: [msg("inbound", "Kunle Adebayo", "I uploaded the wrong certificate by mistake. Can I replace it?", isoOffset(0, 8, 5))],
    }),
    // Sample cases for email delivery states (docs/contracts/inbox-email.md). FICTIONAL.
    seed({
      id: "case-13", reference: "BLV-WFR-000049", subject: "Weekend event staffing (sample: every delivery state)", category: "workforce-request", status: "open",
      sender: { name: "Seun Fashola", kind: "client", organisation: "Sample Lounge Wuse", email: "seun@sample-lounge.example" }, assignedTo: MANAGER, unread: false, related: rel("workforce-request", "wfr-demo-3", "Weekend event"),
      messages: [
        msg("inbound", "Seun Fashola", "We have a private event on Saturday night. Can you confirm 4 servers and 1 bartender?", isoOffset(-3, 9, 0)),
        msg("outbound", MANAGER.name, "Thanks Seun. Yes, we can cover this. I will confirm names tomorrow.", isoOffset(-3, 9, 40), [], dlv("delivered", "seun@sample-lounge.example", isoOffset(-3, 9, 41))),
        msg("outbound", MANAGER.name, "Names for the 4 servers are attached to your request. Bartender to follow.", isoOffset(-2, 10, 5), [], dlv("sent", "seun@sample-lounge.example", isoOffset(-2, 10, 6), { canRetry: false })),
        msg("outbound", MANAGER.name, "Please confirm the start time and dress code for the team.", isoOffset(-2, 11, 0), [], dlv("failed", "seun@sample-lounge.example", isoOffset(-2, 11, 1), { canRetry: true })),
        msg("outbound", MANAGER.name, "Sending the bartender details to the address on file.", isoOffset(-1, 8, 30), [], dlv("bounced", "seun@sample-lounge.exmaple", isoOffset(-1, 8, 31), { canRetry: false })),
        msg("outbound", MANAGER.name, "Quick reminder about the arrival time at 5 pm.", isoOffset(-1, 9, 15), [], dlv("unknown", "seun@sample-lounge.example", isoOffset(-1, 9, 16), { canRetry: false, canCheckStatus: true })),
        msg("inbound", "Seun Fashola", "Sorry, my email was misspelled earlier. Arrival at 5 pm is fine. Start is 6 pm, smart black.", isoOffset(0, 7, 20), [], { viaEmail: true }),
        msg("outbound", MANAGER.name, "Perfect, thank you. All set for Saturday.", isoOffset(0, 7, 50), [], dlv("queued", "seun@sample-lounge.example", isoOffset(0, 7, 50), { canRetry: false })),
      ],
      notes: [{ authorName: MANAGER.name, body: "The earlier address had a typo. Corrected on the client record, retry not needed.", createdAt: isoOffset(-1, 10, 0) }],
    }),
    seed({
      id: "case-14", reference: "BLV-ENQ-000034", subject: "Menu training for a new team (sample: blocked address)", category: "training-enquiry", status: "waiting-on-sender",
      sender: { name: "Bola Akin", kind: "public", organisation: "Sample Bistro", email: "bola@sample-bistro.example" }, assignedTo: MANAGER, unread: false, related: null,
      messages: [
        msg("inbound", "Bola Akin", "Hello, we would like menu knowledge training for 8 staff before our opening.", isoOffset(-4, 10, 0)),
        msg("outbound", MANAGER.name, "Thanks Bola. Here is the course outline and two available dates.", isoOffset(-4, 11, 0), [], dlv("complained", "bola@sample-bistro.example", isoOffset(-4, 11, 4), { canRetry: false })),
      ],
    }),
    // Operations-routed (spec 31.2): never delivered to an HR inbox.
    seed({
      id: "ops-01", reference: "BLV-ENQ-000032", subject: "Public contact: partnership question", category: "public-contact", status: "new", routedTo: "operations",
      sender: { name: "Visitor Example", kind: "public" }, assignedTo: OFFICER, unread: true, related: null,
      messages: [msg("inbound", "Visitor Example", "Hello, who handles partnerships?", isoOffset(0, 7, 0))],
    }),
    seed({
      id: "ops-02", reference: "BLV-ENQ-000033", subject: "Work With Beeliv: consultation request", category: "work-with-beeliv", status: "new", routedTo: "operations",
      sender: { name: "Sample Grill House", kind: "public" }, assignedTo: null, unread: true, related: null,
      messages: [msg("inbound", "Sample Grill House", "We would like a consultation about our service standards.", isoOffset(-1, 8, 0))],
    }),
  ];
}

let store = buildStore();
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
// A different prototype identity (scope) changes which client cases are listed.
subscribeAdminIdentity(emit);

/** Dev helper: restore the fixtures. */
export function resetInboxMock() {
  store = buildStore();
  needsHome = buildNeedsHome();
  emit();
}

/* ---------- permission-aware flags ---------- */

/** Officer: cannot assign (needs Beeliv confirmation). Manager: everything. */
function permissionsFor(role: InboxRole): InboxPermissions {
  return role === "hrManager"
    ? { canAssign: true, canReply: true, canAddNote: true, canChangeStatus: true, canEscalate: true }
    : { canAssign: false, canReply: true, canAddNote: true, canChangeStatus: true, canEscalate: true };
}

/** Spec 31.2 routing + Officer scoping. */
function visibleTo(role: InboxRole, c: Stored): boolean {
  if (c.routedTo !== "hr") return false;
  // Cases from a client follow the assigned-client scope; cases with no client are unaffected.
  if (c.sender.kind === "client" && !textInScope(c.sender.organisation)) return false;
  return role === "hrManager" || c.assignedTo?.id === ME[role].id;
}

function trailingInbound(c: Stored): number {
  let n = 0;
  for (let i = c.messages.length - 1; i >= 0 && c.messages[i].direction === "inbound"; i--) n++;
  return n;
}

function toSummary(c: Stored): InboxCaseSummary {
  const last = c.messages[c.messages.length - 1];
  return {
    id: c.id,
    reference: c.reference,
    subject: c.subject,
    preview: last.body.slice(0, 140),
    category: c.category as InboxCaseCategory,
    status: c.status,
    sender: c.sender,
    assignedTo: c.assignedTo,
    lastActivityAt: c.lastActivityAt,
    attachmentCount: c.messages.reduce((n, m) => n + m.attachments.length, 0),
    unread: c.unread,
    unreadCount: c.unread ? Math.max(1, trailingInbound(c)) : 0,
    lastFromUs: last.direction === "outbound",
    needsAction: c.status !== "resolved" && (c.unread || c.assignedTo === null),
  };
}

/**
 * Where a public reply would go. SERVER decision in real life: the email
 * already on the case; staff cases stay in the app (the brief lists enquirer,
 * client contact and applicant only - needs Beeliv confirmation); an address
 * with a "complained" delivery is suppressed.
 */
function replyRouteFor(c: Stored): ReplyRoute {
  if (c.sender.kind === "staff") return { mode: "none", reason: "in-app-only" };
  if (!c.sender.email) return { mode: "none", reason: "no-email" };
  if (c.messages.some((m) => m.delivery?.state === "complained")) return { mode: "none", reason: "suppressed" };
  return { mode: "email", to: c.sender.email };
}

/** Moves a queued mock email along (queued -> sent -> delivered) so the states can be watched. */
function advance(c: Stored, messageId: string) {
  const step = (state: EmailDeliveryState, ms: number) =>
    setTimeout(() => {
      const m = c.messages.find((x) => x.id === messageId);
      if (!m?.delivery || m.delivery.state === "delivered") return;
      m.delivery = { ...m.delivery, state, updatedAt: new Date().toISOString(), canRetry: false };
      c.messages = [...c.messages];
      emit();
    }, ms);
  step("sent", 1400);
  step("delivered", 3600);
}

/* ---------- Needs a home (unmatched inbound email) - FICTIONAL samples ---------- */

let needsHome: NeedsHomeItem[] = buildNeedsHome();
function buildNeedsHome(): NeedsHomeItem[] {
  return [
    {
      id: "nh-01", fromName: "Gbenga Ola", fromEmail: "gbenga@sample-hotels.example", subject: "Re: Your consultation (BLV-ENQ-0000)", reason: "case-not-found",
      snippet: "Hello, I replied to the link you sent last week but I am not sure it reached the right person. We would still like to book the service audit for our two hotels.",
      receivedAt: isoOffset(0, 8, 12), attachmentCount: 0,
    },
    {
      id: "nh-02", fromName: null, fromEmail: "info@sample-supplier.example", subject: "Partnership offer for your catering clients", reason: "no-case-address",
      snippet: "Dear team, we supply uniforms and aprons to hospitality businesses across Abuja and would like to share our catalogue and prices.",
      receivedAt: isoOffset(-1, 16, 40), attachmentCount: 1,
    },
  ];
}

/* ---------- adapter ---------- */

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

/** Mirrors the shell's prototype states (error / loading) so they can be previewed here too. */
async function gate(): Promise<InboxRole> {
  if (getPrototypeMode() === "loading") return new Promise<never>(() => {});
  await delay();
  if (getPrototypeMode() === "error") throw new Error("Prototype error");
  if (devRole === "none") throw new RestrictedError();
  syncCantAttend();
  return devRole;
}

/* ---------- "Can't make this time" from the Applicant mock (lib/bridge/interview-requests.ts) ---------- */

const cantCaseId = (requestId: string) => `case-cant-${requestId}`;
const whenText = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

/**
 * Makes sure every candidate request has an Inbox case, and closes the case once HR has rescheduled or
 * cancelled the interview. In the real system the backend creates the case and the notification when the
 * candidate sends the request. Assigned to the demo HR officer so an HR Manager and that officer both see it.
 */
function syncCantAttend() {
  for (const req of readRequests()) {
    const id = cantCaseId(req.id);
    let c = store.find((x) => x.id === id);
    if (!c) {
      const interviewId = bridgedInterviewId(req.id);
      const body = [`I can't make my ${req.title} for ${req.applicationLabel} on ${whenText(req.scheduledAt)}.`, `Reason: ${req.reason}`, req.note ? `Note: ${req.note}` : ""].filter(Boolean).join("\n");
      c = {
        ...seed({
          id,
          reference: `BLV-SUP-${req.id.slice(-6).toUpperCase()}`,
          subject: `Can't attend: ${req.applicantName}, ${req.title}`,
          category: "cant-attend",
          status: "new",
          sender: { name: req.applicantName, kind: "applicant", email: req.applicantEmail },
          assignedTo: OFFICER,
          unread: true,
          related: rel("interview", interviewId, `${req.title}, ${req.applicationLabel}`, `/admin/recruitment/interviews/${interviewId}`),
          messages: [msg("inbound", req.applicantName, body, req.requestedAt)],
        }),
        requestId: req.id,
      };
      store = [...store, c];
    }
    if (req.status === "withdrawn" && c.status !== "resolved") {
      const at = req.withdrawnAt ?? new Date().toISOString();
      c.activity = [...c.activity, act("status", "Applicant withdrew the request. The interview stays at its original time.", req.applicantName, at)];
      c.status = "resolved";
      c.unread = false;
      c.lastActivityAt = at;
    } else if (req.status !== "open" && c.status !== "resolved") {
      const text = req.status === "cancelled" ? "Interview cancelled. The candidate has been told." : `Interview rescheduled to ${req.outcome?.scheduledAt ? whenText(req.outcome.scheduledAt) : "a new time"}. The candidate has been told.`;
      c.activity = [...c.activity, act("status", text, MANAGER.name, req.outcome?.decidedAt ?? new Date().toISOString())];
      c.status = "resolved";
      c.unread = false;
      c.lastActivityAt = req.outcome?.decidedAt ?? c.lastActivityAt;
    }
  }
}

function interviewRequestOf(c: Stored): InterviewRequestInfo | undefined {
  if (!c.requestId) return undefined;
  const req = readRequests().find((r) => r.id === c.requestId);
  if (!req) return undefined;
  return { interviewId: bridgedInterviewId(req.id), status: req.status, reason: req.reason, note: req.note, originalAt: req.scheduledAt, interviewLabel: `${req.title}, ${req.applicationLabel}` };
}

// A request sent or answered in another tab refreshes the open Inbox.
if (typeof window !== "undefined") subscribeRequests(() => emit());

function find(role: InboxRole, id: string): Stored {
  const c = store.find((x) => x.id === id);
  if (!c || !visibleTo(role, c)) throw new NotFoundError();
  return c;
}

function touch(c: Stored, kind: ActivityKind, text: string, role: InboxRole) {
  const now = new Date().toISOString();
  c.activity = [...c.activity, act(kind, text, ME[role].name, now)];
  c.lastActivityAt = now;
}

const STATUS_LABEL: Record<InboxStatus, string> = { new: "New", open: "Open", "waiting-on-sender": "Waiting on sender", escalated: "Escalated", resolved: "Resolved" };

export const mockInboxAdapter: InboxAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async getList() {
    const role = await gate();
    const cases = getPrototypeMode() === "empty" ? [] : store.filter((c) => visibleTo(role, c)).map(toSummary);
    cases.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return { role, me: ME[role], permissions: permissionsFor(role), assignees: ASSIGNEES, cases };
  },
  async getCase(id) {
    const role = await gate();
    const c = find(role, id);
    const detail: InboxCaseDetail = {
      ...toSummary(c),
      createdAt: c.createdAt,
      related: c.related,
      messages: c.messages,
      notes: c.notes,
      activity: c.activity,
      replyRoute: replyRouteFor(c),
      interviewRequest: interviewRequestOf(c),
    };
    return { permissions: permissionsFor(role), assignees: ASSIGNEES, detail };
  },
  async reply(id, body) {
    const role = await gate();
    const c = find(role, id);
    await delay(250);
    // No case email, no send (server rule). The UI also disables the composer.
    if (replyRouteFor(c).mode === "none") throw new Error("This case has no email to reply to");
    c.messages = [...c.messages, msg("outbound", ME[role].name, body, new Date().toISOString())];
    const route = replyRouteFor(c);
    if (route.mode !== "email") return; // unreachable: refused above
    const sent = c.messages[c.messages.length - 1];
    sent.delivery = { state: "queued", to: route.to, updatedAt: sent.createdAt, attempts: 1, canRetry: false, canCheckStatus: false };
    if (c.status === "new" || c.status === "open") c.status = "waiting-on-sender";
    c.unread = false;
    touch(c, "reply", "Replied to the sender by email", role);
    advance(c, sent.id);
    emit();
  },
  async addNote(id, body) {
    const role = await gate();
    const c = find(role, id);
    await delay(200);
    c.notes = [...c.notes, { id: uid("n"), authorName: ME[role].name, body, createdAt: new Date().toISOString() }];
    touch(c, "note", "Added an internal note", role);
    emit();
  },
  async assign(id, assigneeId) {
    const role = await gate();
    if (!permissionsFor(role).canAssign) throw new RestrictedError();
    const c = find(role, id);
    c.assignedTo = ASSIGNEES.find((a) => a.id === assigneeId) ?? null;
    if (c.status === "new" && c.assignedTo) c.status = "open";
    touch(c, "assigned", c.assignedTo ? `Assigned to ${c.assignedTo.name}` : "Unassigned", role);
    emit();
  },
  async setStatus(id, status) {
    const role = await gate();
    const c = find(role, id);
    if (c.status === status) return;
    touch(c, "status", `Status changed to ${STATUS_LABEL[status]}`, role);
    c.status = status;
    emit();
  },
  async escalate(id) {
    const role = await gate();
    const c = find(role, id);
    c.status = "escalated";
    touch(c, "escalated", "Escalated for oversight", role);
    emit();
  },
  async retryDelivery(caseId, messageId) {
    const role = await gate();
    const c = find(role, caseId);
    const m = c.messages.find((x) => x.id === messageId);
    // The server decides; a stale button press is refused, never resent.
    if (!m?.delivery || !m.delivery.canRetry || replyRouteFor(c).mode !== "email") throw new Error("Retry is not allowed for this message");
    await delay(250);
    m.delivery = { ...m.delivery, state: "queued", attempts: m.delivery.attempts + 1, canRetry: false, updatedAt: new Date().toISOString() };
    c.messages = [...c.messages];
    touch(c, "reply", "Retried the email", role);
    advance(c, m.id);
    emit();
  },
  async checkDelivery(caseId, messageId) {
    const role = await gate();
    const c = find(role, caseId);
    const m = c.messages.find((x) => x.id === messageId);
    if (!m?.delivery || !m.delivery.canCheckStatus) throw new Error("Nothing to check");
    await delay(600);
    // Sample outcome: still not confirmed. Nothing is ever resent by a check.
    return "unknown";
  },
  async listNeedsHome() {
    await gate();
    if (!canDo("inbox.triage")) throw new RestrictedError();
    return getPrototypeMode() === "empty" ? [] : [...needsHome].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  },
  async searchCasesForPicker(q) {
    await gate();
    if (!canDo("inbox.triage")) throw new RestrictedError();
    const term = q.trim().toLowerCase();
    const out: CasePickerItem[] = store
      .filter((c) => !term || `${c.subject} ${c.sender.name} ${c.sender.organisation ?? ""} ${c.reference}`.toLowerCase().includes(term))
      .map((c) => ({ id: c.id, reference: c.reference, subject: c.subject, senderName: c.sender.name, senderEmail: c.sender.email ?? null }));
    return out.slice(0, 30);
  },
  async assignNeedsHome(itemId, caseId) {
    await gate();
    if (!canDo("inbox.triage")) throw new RestrictedError();
    const item = needsHome.find((n) => n.id === itemId);
    const c = store.find((x) => x.id === caseId);
    if (!item || !c) throw new NotFoundError();
    await delay(300);
    c.messages = [...c.messages, msg("inbound", item.fromName ?? item.fromEmail, item.snippet, item.receivedAt, [], { viaEmail: true })];
    c.unread = true;
    c.lastActivityAt = new Date().toISOString();
    c.activity = [...c.activity, act("reply", "An unmatched email was added to this case", "Operations", c.lastActivityAt)];
    needsHome = needsHome.filter((n) => n.id !== itemId);
    emit();
  },
  async dismissNeedsHome(itemId) {
    await gate();
    if (!canDo("inbox.triage")) throw new RestrictedError();
    await delay(200);
    needsHome = needsHome.filter((n) => n.id !== itemId);
    emit();
  },
  async markRead(id) {
    const role = await gate();
    const c = find(role, id);
    if (!c.unread) return;
    c.unread = false;
    emit();
  },
};
