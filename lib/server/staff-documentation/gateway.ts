/** Server transport only. Authorization belongs to the service-only database functions, never these mappings. */
import type { RpcReply, StaffDocGateway } from "./types";

export type StaffDocRpcPort = { rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcReply> };
const who = (a: { actorUid: string; sessionId: string }) => ({ p_actor_uid: a.actorUid, p_session_id: a.sessionId });

export function staffDocGateway(port: StaffDocRpcPort): StaffDocGateway {
  return {
    checklist: (a) => port.rpc("staff_doc_checklist", who(a)),
    requestSlot: (a) => port.rpc("staff_doc_request_slot", {
      ...who(a), p_slot: a.slot, p_request_id: a.requestId, p_filename: a.fileName, p_size: a.size, p_content_type: a.contentType, p_fingerprint: a.fingerprint,
    }),
    complete: (a) => port.rpc("staff_doc_complete", { ...who(a), p_request_id: a.requestId, p_upload_id: a.uploadId }),
    uploadStatus: (a) => port.rpc("staff_doc_upload_status", { ...who(a), p_upload_id: a.uploadId }),
    hrQueue: (a) => port.rpc("staff_doc_hr_queue", {
      ...who(a), p_query: {
        ...(a.query.state ? { state: a.query.state } : {}), ...(a.query.slot ? { slot: a.query.slot } : {}), ...(a.query.clientId ? { clientId: a.query.clientId } : {}),
        ...(a.query.search ? { search: a.query.search } : {}), page: a.query.page, pageSize: a.query.pageSize,
      },
    }),
    hrOpen: (a) => port.rpc("staff_doc_hr_open", { ...who(a), p_version_id: a.versionId, p_reason_code: a.reason }),
    hrDecide: (a) => port.rpc("staff_doc_hr_decide", {
      ...who(a), p_request_id: a.requestId, p_fingerprint: a.fingerprint, p_version_id: a.command.versionId, p_decision: a.command.decision,
      p_reason_code: a.command.reasonCode, p_message: a.command.message, p_expires_on: a.command.expiresOn, p_expected_seq: a.command.expectedSeq,
    }),
    completion: (a) => port.rpc("staff_doc_completion", { ...who(a), p_audience: a.audience, p_person_ids: a.personIds }),
  };
}
