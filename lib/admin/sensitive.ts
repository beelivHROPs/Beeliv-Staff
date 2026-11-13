"use client";

/**
 * Sensitive values (NIN, bank account) in Admin - PROTOTYPE.
 *
 * Decision (project lead, HANDOFF-LOG 2026-10-13): masked by default; an authorised
 * person may "Reveal" one value after giving a reason, and every reveal is recorded.
 * Clients and Talent never reveal (this file is Admin only).
 *
 * Project lead 2026-10-17: Beeliv wants OPERATIONS and the HR MANAGER to see NIN / bank details directly
 * with authority. For these two roles there is no reason dialog, no countdown and no
 * re-masking: the value is shown at once and a silent audit record ("Viewed NIN
 * details of <name>", who, when, no reason, never the value) is appended.
 * The assigned HR officer KEEPS masked + Reveal-with-reason (staff in scope only; never applicants).
 *
 * Capability table (who may reveal):
 *   operations   yes, shown directly + silent audit (see above)
 *   hr_manager   yes, shown directly + silent audit (project lead 2026-10-17)
 *   hr_officer   yes ONLY for staff inside their assigned scope (never for applicants)
 *
 * Nothing here is access control: the real check, the real value and the real audit
 * record live on the server (Codex). The audit list below is in memory only and is
 * read by the Operations Activity mock so a reveal shows up there.
 */
import { getAdminIdentity, type AdminIdentityId } from "./ops/identity";
import { roleForIdentity } from "./role-access";
import type { ActivityEvent } from "./ops/activity-types";

export interface SensitiveSubject {
  kind: "staff" | "applicant";
  /** The staff member is inside the viewer's assigned clients / outlets. */
  inScope: boolean;
}

export function canRevealSensitive(identity: AdminIdentityId, subject: SensitiveSubject): boolean {
  const role = roleForIdentity(identity);
  if (role === "operations") return true;
  if (role === "hr_manager") return true; // needs Beeliv confirmation
  return subject.kind === "staff" && subject.inScope;
}

/** Operations and the HR Manager see sensitive values directly (no reason, no timer). The assigned HR officer is masked + Reveal-with-reason. */
export const showsSensitiveDirectly = (identity: AdminIdentityId): boolean => {
  const role = roleForIdentity(identity);
  return role === "operations" || role === "hr_manager";
};

export const REVEAL_SECONDS = 30;
export const REASON_MIN = 10;
export const REASON_MAX = 200;

/** Last digits of a masked display value ("NIN ending 4821", "*******7421"), or "" when none. */
const lastDigits = (masked?: string) => (masked ?? "").match(/(\d{2,4})\D*$/)?.[1] ?? "";

/** "•••• ••• 4821" (or all dots when no digits are known). */
export const maskDisplay = (masked?: string) => `•••• ••• ${lastDigits(masked) || "••••"}`;

/** Obviously fictional full value for the prototype. Never a real number. */
export const sampleValueFor = (label: string, masked?: string) => `SAMPLE-${label.toUpperCase().replace(/[^A-Z]+/g, "")}-0000${lastDigits(masked) || "0000"}`;

/** Fictional bank details for the prototype: the order the UI shows is Account name, Bank name, Account number. */
export function sampleBankFor(ownerName: string, masked?: string) {
  return { accountName: ownerName, bankName: "Sample Bank (fictional)", accountNumber: `012345${lastDigits(masked).padStart(4, "0")}` };
}

/* ---------------- audit list (in memory) ---------------- */

const WHO: Record<AdminIdentityId, { id: string; name: string; role: string }> = {
  "hr-officer": { id: "hr-1", name: "Funke Sample", role: "HR" },
  "hr-officer-none": { id: "hr-1", name: "Funke Sample", role: "HR" },
  "hr-manager": { id: "hr-mgr-1", name: "Ifeoma Sample", role: "HR Manager" },
  ops: { id: "ops-user-1", name: "Adaeze Sample", role: "Head of Operations" },
};

let events: ActivityEvent[] = [];

/** Append a 'revealed' event for the current identity. The value is never stored, only the record and the reason. */
export function recordReveal(input: { record: string; reason: string; href?: string | null }): ActivityEvent {
  const who = WHO[getAdminIdentity()];
  const n = events.length + 1;
  const e: ActivityEvent = {
    id: `evt-reveal-${n}`,
    reference: `BLV-AUD-PLACEHOLDER-R${n}`,
    at: new Date().toISOString(),
    actorId: who.id,
    actorName: who.name,
    actorRole: who.role,
    action: "revealed",
    entityType: "document",
    entityLabel: input.record,
    entityHref: input.href ?? null,
    before: "Masked",
    after: `Shown for ${REVEAL_SECONDS} seconds`,
    note: input.reason,
    sensitive: true,
  };
  events = [e, ...events];
  return e;
}

/**
 * Silent audit record for a DIRECT view (Operations): one event per person+record
 * per minute (re-renders must not spam Activity). Stores only that a view
 * happened - never the value, never a reason. Needs SERVER enforcement later.
 */
export function recordView(input: { label: string; ownerName: string; href?: string | null }): ActivityEvent | null {
  const who = WHO[getAdminIdentity()];
  const entityLabel = `${input.label === "NIN" ? "NIN" : "bank"} details of ${input.ownerName}`;
  const now = Date.now();
  const dup = events.find((e) => e.action === "viewed" && e.actorId === who.id && e.entityLabel === entityLabel && now - new Date(e.at).getTime() < 60_000);
  if (dup) return null;
  const n = events.length + 1;
  const e: ActivityEvent = {
    id: `evt-view-${n}`,
    reference: `BLV-AUD-PLACEHOLDER-V${n}`,
    at: new Date(now).toISOString(),
    actorId: who.id,
    actorName: who.name,
    actorRole: who.role,
    action: "viewed",
    entityType: "document",
    entityLabel,
    entityHref: input.href ?? null,
    before: null,
    after: null,
    note: null,
    sensitive: true,
  };
  events = [e, ...events];
  return e;
}

export const getRevealEvents = (): ActivityEvent[] => events;
