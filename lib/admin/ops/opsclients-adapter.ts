/**
 * Replaceable contract for Operations "Clients & Outlets": UI -> hooks ->
 * service -> adapter -> (dev fixture NOW, Supabase adapter LATER). Read-only:
 * assigning HR uses the existing Operations assignments adapter, reassigning
 * staff uses the staff-assignments adapter. The backend must re-check role
 * (Operations only) on every call; HR gets 403.
 */
import type { AdapterEvent } from "../adapter";
import type { OpsClientDetail, OpsClientsPage, OpsClientsQuery, OpsOutletDetail } from "./opsclients-types";

export interface OpsClientsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listClients(query: OpsClientsQuery): Promise<OpsClientsPage>;
  /** Null when the client does not exist. */
  getClient(clientId: string): Promise<OpsClientDetail | null>;
  /** Null when the client or outlet does not exist. */
  getOutlet(clientId: string, outletId: string): Promise<OpsOutletDetail | null>;
}
