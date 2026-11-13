/**
 * Replaceable contract for the Clients & Outlets screens:
 * UI -> hooks -> service -> adapter -> (dev fixture NOW, Supabase adapter LATER).
 * Every read is re-checked by the backend against the signed-in user's client /
 * outlet assignment (RLS); HR sees assigned clients only.
 */
import type { AdapterEvent } from "../adapter";
import type { ClientDetail, ClientsPage, ClientsQuery, OutletDetail, OutletEdit } from "./types";

export interface ClientsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listClients(query: ClientsQuery): Promise<ClientsPage>;
  /** Resolves null when the id is unknown or not assigned to this user. */
  getClient(id: string): Promise<ClientDetail | null>;
  /** Resolves null when the client or outlet is unknown or not assigned to this user. */
  getOutlet(clientId: string, outletId: string): Promise<OutletDetail | null>;
  /** Saves non-sensitive fields and writes a history entry (who, when, what). */
  updateOutlet(clientId: string, outletId: string, edit: OutletEdit): Promise<void>;
}
