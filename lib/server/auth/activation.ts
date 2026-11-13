import "server-only";
import type { AuthApp } from "./policy";

/** Approved pilot gate. All policy/facts come from authorized DB records, never browser completion flags. */
export type ActivationPolicy = {
  app: AuthApp; version: string; approved: boolean;
  requiredFields: string[]; requiredAgreements: { id: string; version: string }[];
  phoneVerificationRequired: boolean;
  milestone: "invitation_acceptance" | "setup_completion" | "employment_approval";
};
export type ActivationFacts = {
  app: AuthApp; personId: string; active: boolean; emailVerified: boolean; phoneVerified: boolean;
  completedFields: string[]; reachedMilestones: ActivationPolicy["milestone"][];
  assuranceLevel?: "aal1" | "aal2";
  acknowledgements: { personId: string; agreementId: string; version: string; accepted: boolean }[];
};
export type ActivationDecision = { ready: true; policyVersion: string } | { ready: false; reason: "policy_unapproved" | "wrong_app" | "inactive" | "identity_unverified" | "profile_incomplete" | "agreement_missing" | "milestone_pending" | "mfa_required" };
export function evaluateActivation(policy: ActivationPolicy | null, facts: ActivationFacts): ActivationDecision {
  if (!policy?.approved || !policy.version) return { ready: false, reason: "policy_unapproved" };
  if (policy.app !== facts.app) return { ready: false, reason: "wrong_app" };
  if (policy.app === "admin" && facts.assuranceLevel !== "aal2") return { ready: false, reason: "mfa_required" };
  if (!facts.active) return { ready: false, reason: "inactive" };
  if (!facts.emailVerified || policy.phoneVerificationRequired && !facts.phoneVerified) return { ready: false, reason: "identity_unverified" };
  if (!policy.requiredFields.every(field => facts.completedFields.includes(field))) return { ready: false, reason: "profile_incomplete" };
  if (!policy.requiredAgreements.every(agreement => facts.acknowledgements.some(ack => ack.personId === facts.personId && ack.agreementId === agreement.id && ack.version === agreement.version && ack.accepted === true))) return { ready: false, reason: "agreement_missing" };
  if (!facts.reachedMilestones.includes(policy.milestone)) return { ready: false, reason: "milestone_pending" };
  return { ready: true, policyVersion: policy.version };
}

/**
 * M8 Staff activation rule (docs/contracts/auth-staff-activation-amendment.md).
 * This is the offline mirror of the database core `auth_staff_activate_core`; the database re-decides and is
 * authoritative. Every fact comes from authorized DB records, never a browser flag or a Staff ID string.
 * Documents, malware-clean, HR verification and employment status are separate state machines and are NOT inputs.
 */
export type StaffActivationFacts = {
  personActive: boolean;
  setupState: "pending-setup" | "pending-approval" | "active" | "suspended" | null;
  setupOrigin: "legacy" | "recruited" | "account" | null;
  /** Protected auth_people.staff_onboarding_origin, set only by the reviewed record service. */
  personOrigin: "legacy" | "recruited" | null;
  hasStaffReference: boolean;
  accessStatus: "active" | "invited" | "suspended" | "deactivated" | null;
  staffEntitled: boolean;
  /** Provider email confirmed AND equal to the person's email (platform definition; see mailbox-ownership decision). */
  emailVerified: boolean;
  fullNameOk: boolean;
  phoneSet: boolean;
  rule: { approved: boolean; agreementsReady: boolean; milestone: "invitation_acceptance" | "setup_completion" | "employment_approval" } | null;
  requiredAgreements: number;
  requiredAgreementsAccepted: boolean;
  inviterStillAuthorised: boolean;
  record: { exists: boolean; employmentSuspended: boolean; createdByAdmin: boolean } | null;
  placement: { current: boolean; startedByToday: boolean; clientAndOutletActive: boolean; assignedByAdmin: boolean } | null;
};
export type StaffActivationReason = "no_access" | "setup_pending" | "setup_unavailable" | "validation_failed";
export type StaffActivationDecision =
  | { ok: true; changed: boolean }
  | { ok: false; reason: StaffActivationReason };
const deny = (reason: StaffActivationReason): StaffActivationDecision => ({ ok: false, reason });
export function evaluateStaffActivation(f: StaffActivationFacts): StaffActivationDecision {
  if (f.setupState === null || f.accessStatus === null) return deny("no_access");
  if (f.setupState === "active") return f.personActive && f.accessStatus === "active" && f.staffEntitled ? { ok: true, changed: false } : deny("no_access");
  if (f.setupState !== "pending-setup" || !f.personActive || (f.accessStatus !== "active" && f.accessStatus !== "invited")) return deny("no_access");
  if (f.setupOrigin === "recruited" || f.personOrigin === "recruited") return deny("setup_pending");
  if (f.setupOrigin !== "legacy" || f.personOrigin !== "legacy" || !f.hasStaffReference) return deny("setup_unavailable");
  if (!f.emailVerified || !f.inviterStillAuthorised) return deny("no_access");
  if (!f.rule || !f.rule.approved || !f.rule.agreementsReady || (f.rule.milestone !== "invitation_acceptance" && f.rule.milestone !== "setup_completion") || f.requiredAgreements < 1) return deny("setup_unavailable");
  if (!f.fullNameOk || !f.phoneSet || !f.requiredAgreementsAccepted) return deny("validation_failed");
  if (!f.record?.exists) return deny("setup_pending");
  if (f.record.employmentSuspended) return deny("no_access");
  if (!f.record.createdByAdmin) return deny("setup_unavailable");
  if (!f.placement?.current || !f.placement.startedByToday || !f.placement.clientAndOutletActive) return deny("setup_pending");
  if (!f.placement.assignedByAdmin) return deny("setup_unavailable");
  return { ok: true, changed: true };
}

export type StaffReconcileResult = "activated" | "already_active" | "pending" | "held" | "unavailable";
export type StaffReconcilePort = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
/**
 * Server-only. Call AFTER a placement commit with the person id taken from that result (never from the browser).
 * Safe to repeat for any person: the database applies the same rule and active people are a no-op.
 * A transport error is "unavailable": it never claims failure of the placement and never exposes provider text.
 */
export async function reconcileStaffActivation(port: StaffReconcilePort, personId: string): Promise<StaffReconcileResult> {
  if (typeof personId !== "string" || !UUID.test(personId)) return "unavailable";
  let reply: { data: unknown; error: unknown };
  try { reply = await port.rpc("auth_staff_activation_reconcile", { p_person_id: personId }); } catch { return "unavailable"; }
  if (!reply || typeof reply !== "object" || Array.isArray(reply) || reply.error || !reply.data || typeof reply.data !== "object" || Array.isArray(reply.data)) return "unavailable";
  const d = reply.data as { ok?: unknown; result?: unknown; reason?: unknown };
  if (d.ok === true) return d.result === "activated" ? "activated" : d.result === "already_active" ? "already_active" : "unavailable";
  if (d.ok === false && (d.reason === "setup_pending" || d.reason === "validation_failed")) return "pending";
  if (d.ok === false && d.reason === "no_access") return "held";
  return "unavailable";
}
