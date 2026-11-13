"use client";

import { useResource, type Resource } from "../interviews/hooks";
import * as service from "./service";
import type { AssessmentDetail, AssessmentsPage, AssessmentsQuery } from "./types";

const subscribe = (cb: () => void) => service.subscribeAssessments(cb);

export function useAssessments(q: AssessmentsQuery): Resource<AssessmentsPage> {
  return useResource(() => service.listAssessments(q), q, subscribe, (d) => d === null || d.workspaceEmpty);
}

export function useAssessment(id: string): Resource<AssessmentDetail> {
  return useResource(() => service.getAssessment(id).then((d) => d as AssessmentDetail), id, subscribe, (d) => d === null);
}
