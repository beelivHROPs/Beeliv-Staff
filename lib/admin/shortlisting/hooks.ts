"use client";

import { useResource, type Resource } from "../interviews/hooks";
import * as service from "./service";
import type { ShortlistingPage, ShortlistingQuery } from "./types";

const subscribe = (cb: () => void) => service.subscribeShortlisting(cb);

export function useShortlisting(q: ShortlistingQuery): Resource<ShortlistingPage> {
  return useResource(() => service.listCandidates(q), q, subscribe, (d) => d === null || d.workspaceEmpty);
}

export const bulkScreeningAction = service.bulkAction;
