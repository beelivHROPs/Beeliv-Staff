"use client";

/** Operations Setup hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useLoad, type Live } from "./assignments-hooks";
import * as service from "./setup-service";
import type { RoleSummary, SetupFormId, SetupOverview, SetupRecord } from "./setup-types";

export const useSetupOverview = (): Live<SetupOverview> => useLoad(() => service.getSetupOverview(), "overview", (d) => d === null, service.subscribeSetup);
export const useSetupSection = <K extends SetupFormId>(id: K): Live<SetupRecord<K>> => useLoad(() => service.getSetupSection(id), id, (d) => d === null, service.subscribeSetup);
export const useSetupRoles = (): Live<RoleSummary[]> => useLoad(() => service.getSetupRoles(), "roles", (d) => d === null || d.length === 0, service.subscribeSetup);

export const saveSetupSection = service.saveSetupSection;
export { ConflictError } from "./adapter";
export { SetupValidationError } from "./setup-types";
