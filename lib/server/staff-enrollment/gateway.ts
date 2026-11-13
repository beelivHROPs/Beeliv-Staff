/** Server transport only. Authorization belongs to the service-only database functions, never these mappings. */
import type { RpcReply, StaffEnrollmentGateway } from "./types";

export type StaffEnrollmentRpcPort = { rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcReply> };

const r = (a: { actorUid: string; sessionId: string }) => ({ p_actor_uid: a.actorUid, p_session_id: a.sessionId });
const w = (a: { actorUid: string; sessionId: string; requestId: string; fingerprint: string }) =>
  ({ ...r(a), p_request_id: a.requestId, p_fingerprint: a.fingerprint });

export function staffEnrollmentGateway(port: StaffEnrollmentRpcPort): StaffEnrollmentGateway {
  return {
    personalGet: (a) => port.rpc("staff_enroll_personal_get", r(a)),
    employmentGet: (a) => port.rpc("staff_enroll_employment_get", r(a)),
    sensitiveStatus: (a) => port.rpc("staff_enroll_sensitive_status", r(a)),
    checklistGet: (a) => port.rpc("staff_enroll_checklist_get", r(a)),
    personalSave: (a) => port.rpc("staff_enroll_personal_save", { ...w(a), p_input: a.input }),
    employerSave: (a) => port.rpc("staff_enroll_employer_save", { ...w(a), p_which: a.which, p_input: a.input }),
    // Only ciphertext (hex), a keyed digest (hex) and a mask cross this boundary. The plaintext value never does.
    sensitiveSave: (a) => port.rpc("staff_enroll_sensitive_save", {
      ...w(a), p_person_id: a.personId, p_section: a.section, p_key_id: a.sealed.keyId, p_nonce_hex: a.sealed.nonceHex, p_ciphertext_hex: a.sealed.ciphertextHex,
      p_mask: a.mask, p_digest_hex: a.digest ? a.digest.hex : null, p_digest_key_id: a.digest ? a.digest.keyId : null,
    }),
  };
}
