"use client";

/** Browser HTTP auth transport. Provider tokens and privileged keys never reach this module. */
import { parseAccessLinkResult, parseInvitationList, parseManagedInvitation, type InvitationListInput } from "./invitation-management-wire";
import type { Portal, SignInFailure, SignInResult, SimpleResult } from "./types";
import { asRecord, authFailure, type AuthWireFailure } from "./wire";
import { parseInvitationAcceptance, parseInvitationPreview, portalDestination, type InvitationAcceptInput, type InvitationAcceptResult, type InvitationPreviewResult } from "./invitation-wire";
export type { InvitationPreview, InvitationPreviewResult, InvitationAcceptInput, InvitationAcceptResult } from "./invitation-wire";
import { parseMfaStatus, parseMfaEnrollment, parseMfaVerification, parseMfaCancellation } from "./mfa-wire";
import { parseSetup, type SetupResult } from "./setup-wire";

type AuthResponse = { ok: true; value: Record<string, unknown> } | AuthWireFailure;
async function request(action: string, input: unknown): Promise<AuthResponse> {
  const fallback = ["invite-create-draft","invite-edit-draft","invite-review","invite-send","invite-resend","invite-revoke","invite-replace","invite-copy-link","invite-accept","setup-profile","setup-agreement","setup-finish","mfa-enroll","mfa-verify","mfa-cancel-enrollment"].includes(action) ? "outcome_unknown" : "unavailable";
  try {
    const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20000) });
    const value = asRecord(await response.json());
    if (!value) return authFailure(undefined, fallback);
    if (!response.ok) {
      // A server failure during acceptance cannot establish whether the transaction committed.
      if (["invite-create-draft","invite-edit-draft","invite-review","invite-send","invite-resend","invite-revoke","invite-replace","invite-copy-link","invite-accept","setup-profile","setup-agreement","setup-finish","mfa-enroll","mfa-verify","mfa-cancel-enrollment"].includes(action) && response.status >= 500) return authFailure({ reason: "outcome_unknown", error: value.error }, fallback);
      return authFailure(value, fallback);
    }
    if (value.ok === false) return authFailure(value, fallback);
    return { ok: true, value };
  } catch { return authFailure(undefined, fallback); }
}
export async function signIn(input: { email: string; password: string; remember: boolean; portal: Portal; next?: string | null }): Promise<SignInResult> {
  const result = await request("sign-in", input);
  if (result.ok) return result.value.ok === true && portalDestination(result.value.destination, input.portal) ? { ok: true, destination: result.value.destination } : { ok: false, reason: "unavailable", error: authFailure().error };
  const allowed: SignInFailure[] = ["invalid_credentials","email_unverified","rate_limited","suspended","no_access","unavailable","offline"];
  return { ok: false, reason: allowed.includes(result.reason as SignInFailure) ? result.reason as SignInFailure : "unavailable", error: result.error };
}
export async function signOut(portal: Portal): Promise<SimpleResult> {
  const result = await request("sign-out", { portal });
  return !result.ok ? result : result.value.ok === true ? { ok: true } : authFailure();
}
export async function getSession(portal: Portal) {
  const result = await request("session", { portal }); return result.ok ? result.value : result;
}
export async function getInvitationByToken(token: string, portal: Portal): Promise<InvitationPreviewResult> {
  const result = await request("invite-preview", { portal, token });
  return result.ok ? parseInvitationPreview(result.value, portal) : result;
}
export async function acceptInvitation(input: InvitationAcceptInput): Promise<InvitationAcceptResult> {
  const result = await request("invite-accept", input);
  return result.ok ? parseInvitationAcceptance(result.value, input.portal) : result;
}
/** Authenticated observation only; a used link alone never restores access. */
export async function reconcileInvitation(input: { portal: Portal; token: string }): Promise<InvitationAcceptResult> {
  const result = await request("invite-reconcile", input);
  return result.ok ? parseInvitationAcceptance(result.value, input.portal) : result;
}
export async function getAccountSetup(portal: Portal): Promise<SetupResult> {
  const result = await request("setup", { portal });
  return result.ok ? parseSetup(result.value, portal) : result;
}
export async function saveSetupProfile(input: { portal: Portal; expectedRevision: number; fullName: string; phone: string }): Promise<SetupResult> {
  const result = await request("setup-profile", input); return result.ok ? parseSetup(result.value, input.portal) : result;
}
export async function answerSetupAgreement(input: { portal: Portal; expectedRevision: number; agreementId: string; bodyHash: string; accepted: boolean }): Promise<SetupResult> {
  const result = await request("setup-agreement", input); return result.ok ? parseSetup(result.value, input.portal) : result;
}
export async function finishAccountSetup(input: { portal: Portal; expectedRevision: number }): Promise<SetupResult> {
  const result = await request("setup-finish", input); return result.ok ? parseSetup(result.value, input.portal) : result;
}
export async function getAdminMfaStatus() {
  const result = await request("mfa-status", { portal: "admin" }); return result.ok ? parseMfaStatus(result.value) : result;
}
export async function enrollAdminMfa() {
  const result = await request("mfa-enroll", { portal: "admin" }); return result.ok ? parseMfaEnrollment(result.value) : result;
}
export async function verifyAdminMfa(input: { factorId: string; code: string }) {
  const result = await request("mfa-verify", { portal: "admin", ...input }); return result.ok ? parseMfaVerification(result.value) : result;
}
export async function cancelAdminMfaEnrollment(factorId: string) {
  const result = await request("mfa-cancel-enrollment", { portal: "admin", factorId }); return result.ok ? parseMfaCancellation(result.value) : result;
}
/** Verification delivery is not connected yet: fail explicitly instead of showing fake email success. */
export async function resendVerificationEmail(email: string): Promise<SimpleResult> {
  void email;
  return { ok: false, error: { code: "unavailable", message: "We couldn't send a verification email. Please contact Beeliv for help." } };
}

/** Administrative writes need a stable requestId for explicit reconciliation/retry. */
export async function createInvitationDraft(input: import("./invitation-management-wire").InvitationDraftInput & {requestId:string}) {
 const result=await request("invite-create-draft",{portal:"admin",...input});return result.ok?parseManagedInvitation(result.value):result;
}
export async function editInvitationDraft(input: import("./invitation-management-wire").InvitationDraftInput & {requestId:string;invitationId:string;expectedRevision:number}) {
 const result=await request("invite-edit-draft",{portal:"admin",...input});return result.ok?parseManagedInvitation(result.value):result;
}
export async function invitationAction(action:"invite-review"|"invite-send"|"invite-resend"|"invite-revoke"|"invite-replace",input:{requestId:string;invitationId:string;expectedRevision:number}){
 const result=await request(action,{portal:"admin",...input});return result.ok?parseManagedInvitation(result.value):result;
}
export async function checkInvitationStatus(invitationId:string){
 const result=await request("invite-status",{portal:"admin",invitationId});return result.ok?parseManagedInvitation(result.value):result;
}

/** Copy-link delivery. The returned `accessLink` is shown once; a replay or reload never returns it again. */
export async function createInvitationAccessLink(input:{requestId:string;invitationId:string;expectedRevision:number}){
 const result=await request("invite-copy-link",{portal:"admin",...input});return result.ok?parseAccessLinkResult(result.value):result;
}

/** Admin Team and Access list (read-only). Actor and session are derived on the server; only paging and an optional status filter are sent. */
export async function listInvitations(input: Partial<InvitationListInput> = {}) {
 const body: Record<string, unknown> = { portal: "admin" };
 if (input.limit !== undefined) body.limit = input.limit;
 if (input.status) body.status = input.status;
 if (input.after) body.after = input.after;
 const result = await request("invite-list", body); return result.ok ? parseInvitationList(result.value) : result;
}
