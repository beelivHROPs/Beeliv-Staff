/**
 * Replaceable contract for Operations "Staff Assignments": UI -> hooks ->
 * service -> adapter -> (dev fixture NOW, Supabase adapter LATER). The backend
 * must re-check role (Operations only) on every call, validate client / outlet /
 * role / effective date, write the new placement and close the old one in ONE
 * transaction (history is never overwritten), record an audit event, and refuse
 * a stale `expectedRevision` with a ConflictError (HTTP 409). Nothing is emailed
 * by the demo adapter.
 */
import type { AdapterEvent } from "../adapter";
import type { OpsStaffDetail, OpsStaffPage, OpsStaffQuery, ReassignInput } from "./staffassign-types";

export interface OpsStaffAssignAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listStaff(query: OpsStaffQuery): Promise<OpsStaffPage>;
  /** Null when the staff member does not exist. */
  getStaff(staffId: string): Promise<OpsStaffDetail | null>;
  /** Throws ConflictError when the revision is stale. */
  reassign(staffId: string, input: ReassignInput): Promise<OpsStaffDetail>;
}
