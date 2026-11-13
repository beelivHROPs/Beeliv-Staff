/**
 * MOCK BRIDGE (Admin reads what participants sent). The only place lib/admin touches the participant outbox.
 * Turns each sent attempt into an Admin submission so Admin results show in-application and standalone attempts.
 * The real version is a server-side query; participants never read Admin data.
 */
import { listSentAttempts, subscribeOutbox } from "@/lib/forms/participant-outbox";
import type { FormSubmission } from "@/lib/forms/types";

export function sentAsSubmissions(): FormSubmission[] {
  return listSentAttempts().map((a) => ({
    id: a.id,
    formId: a.formId,
    formVersion: a.formVersion,
    takerId: a.takerId,
    takerName: a.takerName,
    takerType: a.takerType,
    applicationId: a.applicationId,
    vacancyId: a.vacancyId,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    status: "submitted" as const,
    answers: a.answers,
    otherText: a.otherText,
  }));
}

export const subscribeSent = subscribeOutbox;
