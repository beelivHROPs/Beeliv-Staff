/**
 * Replaceable contract for Admin setup: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, server adapter LATER on setup / setup-profile /
 * setup-agreement / setup-finish). No rule lives in a component; the server
 * re-checks everything and decides completion.
 */
import type { AdapterEvent } from "../adapter";
import type { AdminSetup, FinishResult, MfaEnrollment, MfaFactor, ProfileInput } from "./types";

export interface SetupAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getSetup(): Promise<AdminSetup>;
  saveProfile(input: ProfileInput): Promise<AdminSetup>;
  respondAgreement(agreementId: string, accepted: boolean): Promise<AdminSetup>;
  finish(): Promise<FinishResult>;
  /** mfa-status (Admin only). Existing factors; enrolment status never proves current-session MFA. */
  mfaStatus(): Promise<MfaFactor[]>;
  /** mfa-enroll: a NEW enrolment only; never silently replaces a verified factor. */
  mfaEnroll(): Promise<MfaEnrollment>;
  /** mfa-verify: resolves only on a server-verified code. Reload setup and finish afterwards. */
  mfaVerify(factorId: string, code: string): Promise<void>;
  /** mfa-cancel-enrollment: explicit, only an owned UNVERIFIED enrolment. */
  mfaCancel(factorId: string): Promise<void>;
}
