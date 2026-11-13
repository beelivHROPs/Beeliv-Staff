/** Server transport only. Authorization belongs to the service-only database functions, never these mappings. */
import type { ApplicationsGateway, RpcReply } from "./types";

export type ApplicationsRpcPort = { rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcReply> };

export function applicationsGateway(port: ApplicationsRpcPort): ApplicationsGateway {
  return {
    open: (a) => port.rpc("recruitment_application_draft_open", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_request_id: a.requestId, p_vacancy_id: a.vacancyId, p_fingerprint: a.fingerprint }),
    get: (a) => port.rpc("recruitment_application_draft_get", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId }),
    save: (a) => port.rpc("recruitment_application_draft_save", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_request_id: a.requestId, p_application_id: a.applicationId, p_expected_revision: a.expectedRevision, p_form: a.form, p_fingerprint: a.fingerprint }),
    submit: (a) => port.rpc("recruitment_application_submit", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_request_id: a.requestId, p_application_id: a.applicationId, p_expected_revision: a.expectedRevision, p_fingerprint: a.fingerprint }),
    listMine: (a) => port.rpc("recruitment_application_applicant_list", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_page: a.page, p_page_size: a.pageSize }),
    readMine: (a) => port.rpc("recruitment_application_applicant_read", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId }),
    adminList: (a) => port.rpc("recruitment_application_admin_list", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_query: a.query }),
    adminRead: (a) => port.rpc("recruitment_application_admin_read", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId }),
  };
}
