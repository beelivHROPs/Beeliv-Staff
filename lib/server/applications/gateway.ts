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
    adminAct: (a) => port.rpc("recruitment_application_admin_act", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId, p_expected_revision: a.expectedRevision, p_action: a.action, p_note: a.note }),
    adminHistory: (a) => port.rpc("recruitment_application_admin_history", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId }),
    // Phase 2 interviews (docs/contracts/recruitment-interviews-phase2.sql).
    interviewAdminList: (a) => port.rpc("recruitment_interview_admin_list", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_from: a.from, p_to: a.to, p_application_id: a.applicationId }),
    interviewAdminSave: (a) => port.rpc("recruitment_interview_admin_save", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId, p_interview_id: a.interviewId, p_expected_revision: a.expectedRevision, p_starts_at: a.startsAt, p_duration_mins: a.durationMins, p_mode: a.mode, p_location: a.location, p_interviewer_name: a.interviewerName, p_note: a.note }),
    interviewAdminCancel: (a) => port.rpc("recruitment_interview_admin_cancel", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_interview_id: a.interviewId, p_expected_revision: a.expectedRevision, p_note: a.note }),
    interviewAdminRecord: (a) => port.rpc("recruitment_interview_admin_record", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_interview_id: a.interviewId, p_expected_revision: a.expectedRevision, p_scores: a.scores, p_recommendation: a.recommendation, p_outcome: a.outcome, p_note: a.note }),
    adminVerify: (a) => port.rpc("recruitment_application_admin_verify", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId, p_expected_revision: a.expectedRevision, p_note: a.note }),
    hooDecide: (a) => port.rpc("recruitment_application_hoo_decide", { p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_application_id: a.applicationId, p_expected_revision: a.expectedRevision, p_decision: a.decision, p_note: a.note }),
    interviewApplicantList: (a) => port.rpc("recruitment_interview_applicant_list", { p_actor_uid: a.actorUid, p_session_id: a.sessionId }),
  };
}
