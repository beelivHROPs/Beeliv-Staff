"use client";

/** Operations Activity hook. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import * as service from "./activity-service";
import type { ActivityPage, ActivityQuery } from "./activity-types";
import { useLoad, type Live } from "./hooks";

export const useActivity = (q: ActivityQuery): Live<ActivityPage> => useLoad(() => service.listActivity(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
