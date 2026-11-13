/**
 * Replaceable contract for the Operations Setup Center: UI -> hooks -> service ->
 * adapter -> (dev fixture NOW, Supabase adapter LATER). The backend must re-check
 * role (Operations only), validate every field again, refuse a stale
 * `expectedRevision` with a ConflictError (HTTP 409) and record an audit event
 * per save. Nothing is applied to real invitations or approvals by the demo adapter.
 */
import type { AdapterEvent } from "../adapter";
import type { RoleSummary, SetupFormId, SetupOverview, SetupRecord, SetupValues } from "./setup-types";

export interface OpsSetupAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getOverview(): Promise<SetupOverview>;
  getSection<K extends SetupFormId>(id: K): Promise<SetupRecord<K>>;
  /** Throws SetupValidationError (fields) or ConflictError (stale revision). */
  saveSection<K extends SetupFormId>(id: K, values: SetupValues[K], expectedRevision: number): Promise<SetupRecord<K>>;
  /** Read-only summary of the RBAC design. */
  getRoles(): Promise<RoleSummary[]>;
}
