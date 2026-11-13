/**
 * EVENT CATALOGUE: the one list of things Beeliv can announce to a person.
 * FRONTEND PROPOSAL (docs/MESSAGING-SYSTEM-REVIEW.md, build order step 1); the
 * server version is Codex's. Each entry says who receives it, whether it is
 * REQUIRED (cannot be switched off) or OPTIONAL, which channels it uses by
 * default, and which interface sound it maps to (Admin and Client apps only;
 * the sound lives in lib/admin/sound.ts and is controlled by its category).
 *
 * Decisions this file encodes (project lead, 2026-10-19):
 *  - Email only. There is no SMS or WhatsApp channel.
 *  - REQUIRED: security, invitations and setup, agreements that need acceptance,
 *    document requests, interview time / changes / cancellations (and the
 *    reminders for them), offers and decisions, and the account updates people
 *    need to follow an application.
 *  - OPTIONAL (switchable): job alerts (opt-in, default OFF), news and tips,
 *    announcements, and the Admin/Client/Staff work notifications.
 *  - Interview reminders: candidate 24 hours and 2 hours before; interviewer 1 hour before.
 */
import type { SoundCategory, SoundName } from "@/lib/admin/sound";
import type { NotificationChannels, NotificationSeverity } from "./types";

export type Audience = "applicant" | "staff" | "client" | "hr" | "ops";

/** A sound and the sound category (Settings switch) it belongs to. */
interface Snd {
  sound: SoundName;
  category: SoundCategory;
}
const NOTIFY: Snd = { sound: "notify", category: "messages" };
const MESSAGE: Snd = { sound: "message", category: "messages" };
const RING: Snd = { sound: "ringtone", category: "alerts" };
const APPROVAL: Snd = { sound: "approvalWaiting", category: "alerts" };
const INTERVIEW_SOON: Snd = { sound: "interviewSoon", category: "alerts" };
const PLACEMENT: Snd = { sound: "placement", category: "actions" };

export interface EventDef {
  /** Short label for settings and logs. */
  label: string;
  audiences: Audience[];
  /** true = cannot be switched off. */
  required: boolean;
  /** Default channels. A person's choice may only turn OPTIONAL events off; required events always keep them. */
  channels: NotificationChannels;
  /** Severity used when a producer gives none. */
  severity: NotificationSeverity;
  /** Sound for apps that have sounds (Admin, Client); null = silent. Applicant and Staff never play sounds. */
  sound: Snd | null;
}

const IN_APP: NotificationChannels = { inApp: true, email: false };
const BOTH: NotificationChannels = { inApp: true, email: true };
const EMAIL_ONLY: NotificationChannels = { inApp: false, email: true };

const def = (label: string, audiences: Audience[], required: boolean, channels: NotificationChannels, severity: NotificationSeverity, sound: Snd | null = null): EventDef => ({
  label,
  audiences,
  required,
  channels,
  severity,
  sound,
});

export const EVENT_CATALOG = {
  /* ---- account, security and agreements (everyone, required) ---- */
  "security.notice": def("Security notice", ["applicant", "staff", "client", "hr", "ops"], true, BOTH, "urgent", NOTIFY),
  "account.invitation": def("Invitation and account setup", ["applicant", "staff", "client", "hr", "ops"], true, EMAIL_ONLY, "attention"),
  "agreement.reacceptance": def("Agreement needs your acceptance", ["staff", "client", "hr", "ops"], true, BOTH, "attention", NOTIFY),
  "general.notice": def("General notice", ["applicant", "staff", "client", "hr", "ops"], false, IN_APP, "info", NOTIFY),

  /* ---- applicant journey ---- */
  "application.received": def("Application received", ["applicant"], true, BOTH, "success"),
  "application.status_changed": def("Application update", ["applicant"], true, BOTH, "info"),
  "application.not_selected": def("Not selected", ["applicant"], true, BOTH, "info"),
  "interview.scheduled": def("Interview scheduled", ["applicant", "client"], true, BOTH, "attention", NOTIFY),
  "interview.changed": def("Interview changed", ["applicant", "client"], true, BOTH, "urgent", NOTIFY),
  "interview.cancelled": def("Interview cancelled", ["applicant", "client"], true, BOTH, "urgent", NOTIFY),
  "interview.reminder": def("Interview reminder (24 hours and 2 hours before)", ["applicant"], true, BOTH, "attention"),
  "interview.reminder_interviewer": def("Interview starts in 1 hour", ["hr", "ops"], false, IN_APP, "attention", INTERVIEW_SOON),
  "document.requested": def("Document requested", ["applicant", "staff"], true, BOTH, "attention", NOTIFY),
  "document.verified": def("Document verified", ["applicant"], true, IN_APP, "success"),
  "document.reminder": def("Documents still needed", ["applicant"], true, BOTH, "attention"),
  "offer.sent": def("Offer sent", ["applicant"], true, BOTH, "attention"),
  "placement.confirmed": def("Placement confirmed", ["applicant", "hr", "ops"], true, BOTH, "success", PLACEMENT),
  "resumption.date": def("Resumption date", ["applicant", "staff"], true, BOTH, "info"),
  "client.approval": def("Client approval", ["applicant"], true, IN_APP, "success"),
  "talent_pool.notice": def("Talent pool notice", ["applicant"], false, IN_APP, "info"),

  /* ---- optional mail for applicants (opt-in, default off) ---- */
  "job.alert": def("Job alerts", ["applicant"], false, EMAIL_ONLY, "info"),
  "news.digest": def("Beeliv news, tips and events", ["applicant"], false, EMAIL_ONLY, "info"),

  /* ---- staff ---- */
  "shift.updated": def("Shift changes", ["staff", "client"], false, IN_APP, "attention"),
  "assignment.changed": def("Assignment changes", ["staff", "client"], false, IN_APP, "info"),
  "leave.updated": def("Leave updates", ["staff"], false, IN_APP, "info"),
  "sop.assigned": def("New SOP", ["staff"], false, IN_APP, "info"),
  "training.assigned": def("New training", ["staff"], false, IN_APP, "info"),
  "announcement.published": def("Announcement", ["staff", "client", "hr", "ops"], false, IN_APP, "info", NOTIFY),

  /* ---- HR and Operations ---- */
  "application.new": def("New application", ["hr"], false, IN_APP, "info", NOTIFY),
  "document.resubmitted": def("Document resubmitted", ["hr"], false, IN_APP, "attention", NOTIFY),
  "interview.today": def("Interview today", ["hr", "ops"], false, IN_APP, "attention", INTERVIEW_SOON),
  "interview.cant_attend": def("Candidate cannot make an interview time", ["hr"], false, IN_APP, "attention", MESSAGE),
  "client.feedback": def("Client feedback received", ["hr"], false, IN_APP, "info", NOTIFY),
  "client.request": def("New client request", ["hr", "ops"], false, IN_APP, "attention", RING),
  "leave.request": def("Leave request", ["hr"], false, IN_APP, "attention", NOTIFY),
  "inbox.assigned": def("Inbox item assigned", ["hr"], false, IN_APP, "attention", MESSAGE),
  "approval.waiting": def("Approval waiting", ["ops"], false, BOTH, "attention", APPROVAL),

  /* ---- Client ---- */
  "client.candidates_ready": def("Candidates ready for review", ["client"], false, IN_APP, "attention", MESSAGE),
  "client.request_updated": def("Workforce request updated", ["client"], false, IN_APP, "info", MESSAGE),
  "client.recruitment_progress": def("Recruitment progress", ["client"], false, IN_APP, "info", MESSAGE),
  "client.attendance_alert": def("Attendance needs attention", ["client"], false, IN_APP, "attention", NOTIFY),
  "client.compliance": def("Document needs attention", ["client"], false, IN_APP, "attention", NOTIFY),
  "client.compliance_expiring": def("Documents expiring", ["client"], false, IN_APP, "info", NOTIFY),
  "client.payroll": def("Payroll schedule available", ["client"], false, IN_APP, "info", NOTIFY),
} as const satisfies Record<string, EventDef>;

export type EventCode = keyof typeof EVENT_CATALOG;

export const EVENT_CODES = Object.keys(EVENT_CATALOG) as EventCode[];

export const eventFor = (code: EventCode): EventDef => EVENT_CATALOG[code];

/** A required message cannot be switched off. */
export const isRequired = (code: EventCode): boolean => EVENT_CATALOG[code].required;

/** The sound for an event (Admin and Client apps), or null when it is silent. */
export const soundForKind = (code: EventCode): SoundName | null => EVENT_CATALOG[code].sound?.sound ?? null;

/** When several new items arrive together, the most important sound wins (one sound, not a chord). */
const SOUND_PRIORITY: SoundName[] = ["ringtone", "approvalWaiting", "interviewSoon", "overdue", "placement", "message", "notify"];

export function soundForKinds(codes: EventCode[]): SoundName | null {
  const sounds = codes.map(soundForKind).filter((s): s is SoundName => s !== null);
  return SOUND_PRIORITY.find((s) => sounds.includes(s)) ?? sounds[0] ?? null;
}

/** The sound category (the Settings switch that mutes it) for an event, or null. */
export const soundCategoryForKind = (code: EventCode): SoundCategory | null => EVENT_CATALOG[code].sound?.category ?? null;

export const eventsForAudience = (a: Audience): EventCode[] => EVENT_CODES.filter((c) => EVENT_CATALOG[c].audiences.includes(a));
