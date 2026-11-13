/**
 * Operations "Clients & Outlets" service: the single door the hooks use. No business rules here.
 * Mock or live is chosen per call from the server's decision (lib/admin/org-records/mode.ts). Live never falls back to the fixture.
 */
import type { OpsClientsAdapter } from "./opsclients-adapter";
import { mockOpsClientsAdapter } from "./opsclients-mock";
import { createLiveOpsClientsAdapter } from "../org-records/live";
import { orgRecordsMode } from "../org-records/mode";

const live = createLiveOpsClientsAdapter();
const adapter = (): OpsClientsAdapter => (orgRecordsMode() === "live" ? live : mockOpsClientsAdapter);

export const subscribeOpsClients: OpsClientsAdapter["subscribe"] = (l) => {
  const stopMock = mockOpsClientsAdapter.subscribe(l);
  const stopLive = live.subscribe(l);
  return () => { stopMock(); stopLive(); };
};
export const listClients: OpsClientsAdapter["listClients"] = (q) => adapter().listClients(q);
export const getClient: OpsClientsAdapter["getClient"] = (id) => adapter().getClient(id);
export const getOutlet: OpsClientsAdapter["getOutlet"] = (c, o) => adapter().getOutlet(c, o);
