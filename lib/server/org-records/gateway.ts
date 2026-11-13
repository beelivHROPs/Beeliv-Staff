/** Server transport only. Authorization belongs to the service-only database functions, never these mappings. */
import type { OrgRecordsGateway, RpcReply } from "./types";

export type OrgRecordsRpcPort = { rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcReply> };

const w = (a: { actorUid: string; sessionId: string; requestId: string; fingerprint: string }) =>
  ({ p_actor_uid: a.actorUid, p_session_id: a.sessionId, p_request_id: a.requestId, p_fingerprint: a.fingerprint });
const r = (a: { actorUid: string; sessionId: string }) => ({ p_actor_uid: a.actorUid, p_session_id: a.sessionId });

export function orgRecordsGateway(port: OrgRecordsRpcPort): OrgRecordsGateway {
  return {
    clientList: (a) => port.rpc("org_client_list", { ...r(a), p_query: a.query }),
    clientGet: (a) => port.rpc("org_client_get", { ...r(a), p_client_id: a.clientId, p_outlets_limit: a.outletsLimit, p_outlets_after: a.outletsAfter }),
    clientCreate: (a) => port.rpc("org_client_create", { ...w(a), p_name: a.name, p_business_type: a.businessType, p_city: a.city, p_address: a.address }),
    clientUpdate: (a) => port.rpc("org_client_update", { ...w(a), p_client_id: a.clientId, p_expected_revision: a.expectedRevision, p_patch: a.patch }),
    clientDeactivate: (a) => port.rpc("org_client_deactivate", { ...w(a), p_client_id: a.clientId, p_expected_revision: a.expectedRevision, p_reason: a.reason }),
    outletCreate: (a) => port.rpc("org_outlet_create", { ...w(a), p_client_id: a.clientId, p_name: a.name, p_address: a.address, p_city: a.city, p_phone: a.phone, p_manager: a.manager, p_notes: a.notes }),
    outletUpdate: (a) => port.rpc("org_outlet_update", { ...w(a), p_client_id: a.clientId, p_outlet_id: a.outletId, p_expected_revision: a.expectedRevision, p_patch: a.patch }),
    outletDeactivate: (a) => port.rpc("org_outlet_deactivate", { ...w(a), p_client_id: a.clientId, p_outlet_id: a.outletId, p_expected_revision: a.expectedRevision, p_reason: a.reason }),
    staffList: (a) => port.rpc("org_staff_list", { ...r(a), p_query: a.query }),
    staffGet: (a) => port.rpc("org_staff_get", { ...r(a), p_staff_id: a.staffId, p_history_limit: a.historyLimit, p_history_after: a.historyAfter }),
    staffCreate: (a) => port.rpc("org_staff_create", { ...w(a), p_full_name: a.fullName, p_email: a.email, p_phone: a.phone, p_department: a.department, p_initial_placement: a.initialPlacement }),
    staffUpdate: (a) => port.rpc("org_staff_update", { ...w(a), p_staff_id: a.staffId, p_expected_revision: a.expectedRevision, p_patch: a.patch }),
    staffCorrectEmail: (a) => port.rpc("org_staff_correct_email", { ...w(a), p_staff_id: a.staffId, p_expected_revision: a.expectedRevision, p_email: a.email }),
    placementAssign: (a) => port.rpc("org_placement_assign", { ...w(a), p_staff_id: a.staffId, p_expected_revision: a.expectedRevision, p_client_id: a.clientId, p_outlet_id: a.outletId, p_role: a.role, p_department: a.department, p_effective_date: a.effectiveDate, p_note: a.note }),
  };
}
