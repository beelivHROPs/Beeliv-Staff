"use client";

/** Operations "Staff Assignments" hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useLoad, type Live } from "./assignments-hooks";
import * as service from "./staffassign-service";
import type { OpsStaffDetail, OpsStaffPage, OpsStaffQuery } from "./staffassign-types";

export const useOpsStaff = (q: OpsStaffQuery): Live<OpsStaffPage> => useLoad(() => service.listStaff(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty, service.subscribeStaffAssign);
export const useOpsStaffMember = (id: string): Live<OpsStaffDetail> => useLoad(() => service.getStaff(id), id, (d) => d === null, service.subscribeStaffAssign);

export const reassignStaff = service.reassign;
export { ConflictError } from "./adapter";
