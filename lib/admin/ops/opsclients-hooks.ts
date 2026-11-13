"use client";

/** Operations "Clients & Outlets" hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useLoad, type Live } from "./assignments-hooks";
import * as service from "./opsclients-service";
import type { OpsClientDetail, OpsClientsPage, OpsClientsQuery, OpsOutletDetail } from "./opsclients-types";

export const useOpsClients = (q: OpsClientsQuery): Live<OpsClientsPage> => useLoad(() => service.listClients(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty, service.subscribeOpsClients);
export const useOpsClient = (id: string): Live<OpsClientDetail> => useLoad(() => service.getClient(id), id, (d) => d === null, service.subscribeOpsClients);
export const useOpsOutlet = (clientId: string, outletId: string): Live<OpsOutletDetail> => useLoad(() => service.getOutlet(clientId, outletId), `${clientId}/${outletId}`, (d) => d === null, service.subscribeOpsClients);
