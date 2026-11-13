/**
 * ClientsService: the single door the hooks use. Adds NO business rules.
 * Mock (local development fixtures) or live (org-records endpoints) is chosen per call from the server's decision
 * (lib/admin/org-records/mode.ts). Live never falls back to the fixture.
 */
import type { ClientsAdapter } from "./adapter";
import { mockClientsAdapter } from "./mock";
import { createLiveClientsAdapter } from "../org-records/live";
import { orgRecordsMode } from "../org-records/mode";

const live = createLiveClientsAdapter();
const adapter = (): ClientsAdapter => (orgRecordsMode() === "live" ? live : mockClientsAdapter);

export const subscribeClients: ClientsAdapter["subscribe"] = (l) => {
  const stopMock = mockClientsAdapter.subscribe(l);
  const stopLive = live.subscribe(l);
  return () => { stopMock(); stopLive(); };
};
export const listClients: ClientsAdapter["listClients"] = (q) => adapter().listClients(q);
export const getClient: ClientsAdapter["getClient"] = (id) => adapter().getClient(id);
export const getOutlet: ClientsAdapter["getOutlet"] = (c, o) => adapter().getOutlet(c, o);
export const updateOutlet: ClientsAdapter["updateOutlet"] = (c, o, e) => adapter().updateOutlet(c, o, e);
