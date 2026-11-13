/** Pure Admin detail projection. Application counts remain unavailable until that domain is live. */
import { STEP_META } from "../../journeys/types";
import type { VacancyAction, VacancyCapabilities, VacancyDetail, VacancyStatus } from "../../admin/vacancies/types";
import type { AdminVacancyRecord } from "./read-service";

export type AdminVacancyDetailDto = Omit<VacancyDetail, "counts"> & {
  revision: number;
  storedStatus: Exclude<VacancyStatus, "closing-soon">;
  counts: null;
  countsReady: false;
};

function lagosDay(asOf: string): string {
  const date = new Date(asOf);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid read timestamp.");
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function actionsFor(record: AdminVacancyRecord, capabilities: VacancyCapabilities, today: string): VacancyAction[] {
  const status = record.storedStatus;
  if (status === "closed" || status === "filled" || status === "cancelled") return [];
  const actions: VacancyAction[] = [];
  if (status === "draft" && capabilities.canSubmitForApproval) actions.push("submit-for-approval");
  if ((status === "draft" || status === "pending-approval") && capabilities.canPublish && record.closesOn >= today) actions.push("publish");
  if (status === "paused" && capabilities.canPublish && record.closesOn >= today) actions.push("resume");
  if (status === "published" && capabilities.canPause) actions.push("pause");
  if ((status === "published" || status === "paused") && capabilities.canClose) actions.push("close");
  if ((status === "published" || status === "paused") && capabilities.canMarkFilled) actions.push("mark-filled");
  if (capabilities.canCancel) actions.push("cancel");
  return actions;
}

export function projectAdminVacancyDetail(record: AdminVacancyRecord, capabilities: VacancyCapabilities, asOf: string): AdminVacancyDetailDto {
  const today = lagosDay(asOf);
  const input = record.input;
  const journey = structuredClone(input.journey);
  const storedStatus = record.storedStatus as AdminVacancyDetailDto["storedStatus"];
  const canEdit = capabilities.canEdit && !["closed", "filled", "cancelled"].includes(storedStatus)
    && (storedStatus !== "published" || capabilities.canPublish && record.closesOn >= today);
  return {
    id: record.id, revision: record.revision, reference: record.reference,
    status: record.status as VacancyStatus, storedStatus,
    title: input.title, department: input.department,
    client: { ...record.client }, outlet: record.outlet ? { ...record.outlet } : null,
    location: input.location, employmentType: input.employmentType,
    recruiter: record.recruiter ? { ...record.recruiter } : null, openings: input.openings,
    counts: null, countsReady: false,
    postedAt: record.postedAt, closesOn: record.closesOn, endedAt: record.endedAt,
    expectedResumption: input.expectedResumption, about: input.about,
    responsibilities: [...input.responsibilities], essential: [...input.essential], preferred: [...input.preferred],
    experience: { ...input.experience }, skills: [...input.skills], salary: { ...input.salary },
    benefits: input.benefits.map(benefit => ({ ...benefit })), conditions: { ...input.conditions },
    requiredDocuments: { atApplication: [...input.requiredDocuments.atApplication], afterSelection: [...input.requiredDocuments.afterSelection] },
    screeningQuestions: input.screeningQuestions.map(question => ({ ...question })),
    ...(input.testFormId ? { testFormId: input.testFormId } : {}),
    ...(input.image ? { image: { ...input.image } } : {}),
    journey,
    recruitmentProcess: journey.map(step => step.kind === "interview" ? step.interview?.stageName ?? STEP_META[step.kind].label : STEP_META[step.kind].label),
    interview: { ...input.interview },
    allowedActions: actionsFor(record, capabilities, today), canEdit,
    activity: record.activity.map(event => ({ id: event.id, at: event.at, actor: event.actor, action: event.action, from: event.from, to: event.to, ...(event.reason === null ? {} : { reason: event.reason }) })),
  };
}
