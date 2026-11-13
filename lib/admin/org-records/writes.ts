/**
 * The create / edit / deactivate actions that had no adapter method before (wire doc "gaps"):
 * Add client, Edit client, Add outlet, Deactivate client / outlet, Add staff member.
 * Live endpoints only: these controls are shown only when the server reports live mode with writes on
 * (lib/admin/org-records/mode.ts). Never retries a write by itself; one requestId per intent, reused only
 * when the same payload is repeated after an unknown outcome. Staff ID, references, status and revision
 * are never typed or sent by the browser (revision is sent only as expectedRevision).
 */
import type { ClientCreateReceipt, OutletCreateReceipt, StaffCreateReceipt, UpdateReceipt } from "../../server/org-records/types";
import { emitOrgRecordsChanged } from "./events";
import { clearPlacementChoices, knownRevision, rememberRevision } from "./live";
import { createIntentKeys, orgCall, OrgUnavailableError } from "./transport";

const STALE_RELOAD = "Reload the page before changing this record.";
type Call = typeof fetch;

export type ClientFields = { name: string; businessType: string; city: string; address: string };
export type OutletFields = { name: string; address: string; city: string; phone: string; manager: string; notes: string };
export type StaffFields = {
  fullName: string; email: string; phone: string; department: string;
  placement: { clientId: string; outletId: string; role: string; startDate: string } | null;
};

const CLIENT_READS = ["client-get", "client-list"], STAFF_READS = ["staff-get", "staff-list"];
const k = (reads: readonly string[]) => createIntentKeys(undefined, reads);
const keys = { clientCreate: k(CLIENT_READS), clientUpdate: k(CLIENT_READS), clientDeactivate: k(CLIENT_READS), outletCreate: k(CLIENT_READS), outletDeactivate: k(CLIENT_READS), staffCreate: k(STAFF_READS), staffCorrectEmail: k(STAFF_READS) };

async function run<T>(key: keyof typeof keys, payload: Record<string, unknown>, action: Parameters<typeof orgCall>[0], f: Call | undefined, after: (v: T) => void): Promise<T> {
  const requestId = keys[key].begin(payload);
  try {
    const value = await orgCall<T>(action, { requestId, ...payload }, f);
    keys[key].settle(null);
    after(value);
    clearPlacementChoices();
    emitOrgRecordsChanged();
    return value;
  } catch (error) {
    keys[key].settle(error);
    throw error;
  }
}
const revisionOf = (kind: "client" | "outlet", id: string): number => {
  const r = knownRevision(kind, id);
  if (r === undefined) throw new OrgUnavailableError(STALE_RELOAD);
  return r;
};

export const createClient = (v: ClientFields, f?: Call) =>
  run<ClientCreateReceipt>("clientCreate", { name: v.name.trim(), businessType: v.businessType.trim(), city: v.city.trim(), address: v.address.trim() }, "client-create", f, (r) => rememberRevision("client", r.clientId, r.revision));

export function updateClient(clientId: string, patch: Partial<ClientFields>, f?: Call) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, x]) => x !== undefined).map(([k, x]) => [k, String(x).trim()]));
  return run<UpdateReceipt>("clientUpdate", { clientId, expectedRevision: revisionOf("client", clientId), patch: clean }, "client-update", f, (r) => rememberRevision("client", clientId, r.revision));
}
export const deactivateClient = (clientId: string, reason: string, f?: Call) =>
  run<UpdateReceipt>("clientDeactivate", { clientId, expectedRevision: revisionOf("client", clientId), reason: reason.trim() }, "client-deactivate", f, (r) => rememberRevision("client", clientId, r.revision));

export const createOutlet = (clientId: string, v: OutletFields, f?: Call) =>
  run<OutletCreateReceipt>("outletCreate", { clientId, name: v.name.trim(), address: v.address.trim(), city: v.city.trim(), phone: v.phone, manager: v.manager.trim(), notes: v.notes.trim() }, "outlet-create", f, (r) => rememberRevision("outlet", r.outletId, r.revision));
export const deactivateOutlet = (clientId: string, outletId: string, reason: string, f?: Call) =>
  run<UpdateReceipt>("outletDeactivate", { clientId, outletId, expectedRevision: revisionOf("outlet", outletId), reason: reason.trim() }, "outlet-deactivate", f, (r) => rememberRevision("outlet", outletId, r.revision));

/**
 * Corrects the email of a Staff record that has no account yet (server refuses it afterwards). No screen calls this yet:
 * the control is a later UI step. Sends only the staff id, the known revision and the new address; the old address is
 * never sent, stored or logged. A pending invitation to the old address is revoked by the server in the same change.
 */
export async function correctStaffEmail(staffId: string, email: string, f?: Call) {
  const rev = knownRevision("staff", staffId);
  if (rev === undefined) throw new OrgUnavailableError(STALE_RELOAD);
  return run<UpdateReceipt>("staffCorrectEmail", { staffId, expectedRevision: rev, email: email.trim().toLowerCase() }, "staff-correct-email", f, (r) => rememberRevision("staff", staffId, r.revision));
}

/** The minimal staff record. Staff ID is issued by the server; the person gets no access from this. */
export function createStaff(v: StaffFields, f?: Call) {
  const body: Record<string, unknown> = { fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(), phone: v.phone, department: v.department.trim() };
  if (v.placement) body.initialPlacement = { clientId: v.placement.clientId, outletId: v.placement.outletId, role: v.placement.role.trim(), startDate: v.placement.startDate };
  return run<StaffCreateReceipt>("staffCreate", body, "staff-create", f, (r) => rememberRevision("staff", r.staffId, r.revision));
}
