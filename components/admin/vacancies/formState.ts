/**
 * Form state for the create / edit vacancy form, and its client-side validation.
 * Lists are edited as one line per item; numbers as strings while typing.
 * Required (spec 15 + project lead): title, department, client, outlet,
 * location, employment type, openings and the closing date. The adapter
 * re-validates; this only gives instant feedback.
 */
import { applicantTimeline, blankJourney, hasStep, validateJourney, type Journey } from "@/lib/journeys/types";
import type { Benefit, FieldErrors, SalaryFrequency, ScreeningQuestion, VacancyConfig, VacancyDetail, VacancyImage, VacancyInput, Visibility } from "@/lib/admin/vacancies/types";

export interface FormState {
  title: string;
  department: string;
  clientId: string;
  outletId: string;
  location: string;
  employmentType: string;
  openings: string;
  recruiterId: string;
  closesOn: string;
  expectedResumption: string;
  about: string;
  responsibilities: string;
  essential: string;
  preferred: string;
  expMin: string;
  expMax: string;
  expSummary: string;
  skills: string;
  salaryMin: string;
  salaryMax: string;
  frequency: SalaryFrequency;
  negotiable: boolean;
  visibility: Visibility;
  benefits: Benefit[];
  workingDays: string;
  shiftSystem: string;
  hours: string;
  weekends: string;
  publicHolidays: string;
  docsApply: string;
  docsAfter: string;
  questions: ScreeningQuestion[];
  testFormId: string;
  /** Job photo choice. Alt text: null = "Photo for <title>" follows the title until HR edits it. */
  photo: Pick<VacancyImage, "source" | "ref">;
  photoAlt: string | null;
  /** This vacancy's OWN COPY of the application journey. */
  journey: Journey;
  interviewMethod: string;
  interviewLocation: string;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const join = (a: string[]) => a.join("\n");
const num = (s: string): number | null => {
  const d = s.replace(/\D/g, "");
  return d ? Number(d) : null;
};

export const autoAlt = (title: string) => `Photo for ${title.trim() || "this job"}`;
/** The alt text that will be saved: HR's own words, else "Photo for <title>". */
export const effectiveAlt = (s: Pick<FormState, "photoAlt" | "title">) => (s.photoAlt === null ? autoAlt(s.title) : s.photoAlt.trim());

export function emptyState(config: VacancyConfig): FormState {
  return {
    title: "",
    department: "",
    clientId: "",
    outletId: "",
    location: "",
    employmentType: "",
    openings: "1",
    recruiterId: "",
    closesOn: "",
    expectedResumption: "",
    about: "",
    responsibilities: "",
    essential: "",
    preferred: "",
    expMin: "0",
    expMax: "",
    expSummary: "",
    skills: "",
    salaryMin: "",
    salaryMax: "",
    frequency: "Monthly",
    negotiable: false,
    visibility: "public",
    benefits: [],
    workingDays: "",
    shiftSystem: "",
    hours: "",
    weekends: "",
    publicHolidays: "",
    docsApply: join(config.defaultRequiredDocuments.atApplication),
    docsAfter: join(config.defaultRequiredDocuments.afterSelection),
    questions: [],
    testFormId: "",
    photo: { source: "default", ref: "" },
    photoAlt: null,
    journey: blankJourney(),
    interviewMethod: "",
    interviewLocation: "",
  };
}

/** Same steps and ids (an edit must keep step ids so "has applicants in it" still matches). */
const copyJourneyKeepIds = (j: Journey): Journey => structuredClone(j);

export function stateFromDetail(d: VacancyDetail): FormState {
  return {
    title: d.title,
    department: d.department,
    clientId: d.client.id,
    outletId: d.outlet?.id ?? "",
    location: d.location,
    employmentType: d.employmentType,
    openings: String(d.openings),
    recruiterId: d.recruiter?.id ?? "",
    closesOn: d.closesOn,
    expectedResumption: d.expectedResumption,
    about: d.about,
    responsibilities: join(d.responsibilities),
    essential: join(d.essential),
    preferred: join(d.preferred),
    expMin: String(d.experience.minYears),
    expMax: d.experience.maxYears ? String(d.experience.maxYears) : "",
    expSummary: d.experience.summary,
    skills: join(d.skills),
    salaryMin: d.salary.min !== null ? String(d.salary.min) : "",
    salaryMax: d.salary.max !== null ? String(d.salary.max) : "",
    frequency: d.salary.frequency,
    negotiable: d.salary.negotiable,
    visibility: d.salary.visibility,
    benefits: d.benefits.map((b) => ({ ...b })),
    workingDays: d.conditions.workingDays,
    shiftSystem: d.conditions.shiftSystem,
    hours: d.conditions.hours,
    weekends: d.conditions.weekends,
    publicHolidays: d.conditions.publicHolidays,
    docsApply: join(d.requiredDocuments.atApplication),
    docsAfter: join(d.requiredDocuments.afterSelection),
    questions: d.screeningQuestions.map((q) => ({ ...q })),
    testFormId: d.testFormId ?? "",
    photo: d.image ? { source: d.image.source, ref: d.image.ref } : { source: "default", ref: "" },
    photoAlt: d.image && d.image.alt !== autoAlt(d.title) ? d.image.alt : null,
    journey: copyJourneyKeepIds(d.journey),
    interviewMethod: d.interview.method,
    interviewLocation: d.interview.location,
  };
}

export function toInput(s: FormState): VacancyInput {
  return {
    title: s.title.trim(),
    department: s.department,
    clientId: s.clientId,
    outletId: s.outletId,
    location: s.location.trim(),
    employmentType: s.employmentType,
    openings: num(s.openings) ?? 0,
    recruiterId: s.recruiterId,
    closesOn: s.closesOn,
    expectedResumption: s.expectedResumption,
    about: s.about.trim(),
    responsibilities: lines(s.responsibilities),
    essential: lines(s.essential),
    preferred: lines(s.preferred),
    experience: { minYears: num(s.expMin) ?? 0, maxYears: num(s.expMax) ?? undefined, summary: s.expSummary.trim() },
    skills: lines(s.skills),
    salary: { min: num(s.salaryMin), max: num(s.salaryMax), frequency: s.frequency, negotiable: s.negotiable, visibility: s.visibility },
    benefits: s.benefits.filter((b) => b.kind || b.detail.trim()).map((b) => ({ ...b, detail: b.detail.trim() })),
    conditions: { workingDays: s.workingDays.trim(), shiftSystem: s.shiftSystem.trim(), hours: s.hours.trim(), weekends: s.weekends.trim(), publicHolidays: s.publicHolidays.trim() },
    // Content belongs to its journey step: a step that is not in the journey has no content.
    requiredDocuments: { atApplication: hasStep(s.journey, "documents-at-application") ? lines(s.docsApply) : [], afterSelection: hasStep(s.journey, "documents-after-selection") ? lines(s.docsAfter) : [] },
    screeningQuestions: hasStep(s.journey, "screening-questions") ? s.questions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim() })) : [],
    testFormId: hasStep(s.journey, "test-or-form") && s.testFormId ? s.testFormId : undefined,
    journey: structuredClone(s.journey),
    // Untouched (department default, automatic alt) is saved as "no image": the backend then uses the department default.
    image: s.photo.source === "default" && s.photoAlt === null ? undefined : { ...s.photo, alt: effectiveAlt(s) },
    recruitmentProcess: applicantTimeline(s.journey),
    interview: hasStep(s.journey, "interview") ? { method: s.interviewMethod.trim(), location: s.interviewLocation.trim() } : { method: "", location: "" },
  };
}

export const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Instant feedback only; the adapter validates again. `pastOk` lets an unchanged past deadline through when editing. */
export function validateForm(s: FormState, pastOk: boolean): FieldErrors {
  const e: FieldErrors = {};
  if (!s.title.trim()) e.title = "Enter the job title.";
  if (!s.department) e.department = "Choose a department.";
  if (!s.clientId) e.clientId = "Choose the client.";
  else if (!s.outletId) e.outletId = "Choose the outlet.";
  if (!s.location.trim()) e.location = "Enter the job location.";
  if (!s.employmentType) e.employmentType = "Choose the employment type.";
  const openings = num(s.openings);
  if (!openings || openings < 1) e.openings = "Openings must be at least 1.";
  if (!s.closesOn) e.closesOn = "A closing date is required on every vacancy.";
  else if (!pastOk && s.closesOn < todayYmd()) e.closesOn = "The closing date cannot be in the past.";
  const min = num(s.salaryMin);
  const max = num(s.salaryMax);
  if (min !== null && max !== null && max < min) e.salaryMax = "The highest figure cannot be below the lowest.";
  const emin = num(s.expMin) ?? 0;
  const emax = num(s.expMax);
  if (emax !== null && emax < emin) e.expMax = "Maximum years cannot be below the minimum.";
  if (!effectiveAlt(s)) e.photoAlt = "Describe the photo in a few words, for people who cannot see it.";
  if (hasStep(s.journey, "screening-questions") && s.questions.some((q) => !q.text.trim())) e.questions = "Write each screening question, or remove the empty one.";
  Object.assign(e, validateJourney(s.journey));
  return e;
}
