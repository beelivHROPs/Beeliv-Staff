/** Pure vacancy-write boundary. The route/DB transaction still verifies actor, scope and foreign keys. */
import type { VacancyInput } from "@/lib/admin/vacancies/types";

export type ValidatedVacancyInput = Omit<VacancyInput, "outletId" | "recruiterId" | "testFormId" | "image" | "recruitmentProcess"> & {
  outletId: string | null;
  recruiterId: string | null;
  testFormId: string | null;
  image: { source: "default" | "library"; ref: string; alt: string } | null;
};
export type VacancyValidationResult = { ok: true; value: ValidatedVacancyInput } | { ok: false; fields: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOP = ["title", "department", "clientId", "outletId", "location", "employmentType", "openings", "recruiterId", "closesOn", "expectedResumption", "about", "responsibilities", "essential", "preferred", "experience", "skills", "salary", "benefits", "conditions", "requiredDocuments", "screeningQuestions", "testFormId", "image", "journey", "interview", "recruitmentProcess"];
const KINDS = ["application", "screening-questions", "documents-at-application", "test-or-form", "interview", "documents-after-selection", "operations-decision", "offer", "onboarding"] as const;

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function realDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateVacancyInput(raw: unknown): VacancyValidationResult {
  const fields: Record<string, string> = Object.create(null);
  const invalid = (path: string, message = "Invalid value.") => { fields[path] = message; };
  const object = (value: unknown, path: string, keys: readonly string[]): Record<string, unknown> => {
    if (!plain(value)) { invalid(path || "input"); return {}; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) invalid(path ? `${path}.${key}` : key, "This field cannot be set here.");
    return value;
  };
  const text = (value: unknown, path: string, max: number, required = false): string => {
    if (typeof value !== "string" || value.length > max * 2) { invalid(path); return ""; }
    const clean = value.trim();
    if (clean.length > max || required && !clean) invalid(path);
    return clean;
  };
  const pick = <T extends string>(value: unknown, path: string, choices: readonly T[]): T => {
    if (typeof value !== "string" || !choices.includes(value as T)) invalid(path);
    return value as T;
  };
  const whole = (value: unknown, path: string, min: number, max: number): number => {
    if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) invalid(path);
    return value as number;
  };
  const yesNo = (value: unknown, path: string): boolean => {
    if (typeof value !== "boolean") invalid(path);
    return value as boolean;
  };
  const uuid = (value: unknown, path: string, optional = false): string | null => {
    if (optional && (value === "" || value === null || value === undefined)) return null;
    if (typeof value !== "string" || !UUID.test(value)) invalid(path);
    return value as string;
  };
  const array = <T>(value: unknown, path: string, max: number, parse: (item: unknown, path: string) => T): T[] => {
    if (!Array.isArray(value) || value.length > max) { invalid(path); return []; }
    return value.map((item, index) => parse(item, `${path}.${index}`));
  };
  const texts = (value: unknown, path: string, max: number, length: number) => array(value, path, max, (item, itemPath) => text(item, itemPath, length, true));
  const input = object(raw, "", TOP);

  const title = text(input.title, "title", 160, true);
  const department = text(input.department, "department", 80, true);
  const clientId = uuid(input.clientId, "clientId") as string;
  const outletId = uuid(input.outletId, "outletId", true);
  const location = text(input.location, "location", 160, true);
  const employmentType = text(input.employmentType, "employmentType", 60, true);
  const openings = whole(input.openings, "openings", 1, 1000);
  const recruiterId = uuid(input.recruiterId, "recruiterId", true);
  const closesOn = text(input.closesOn, "closesOn", 10, true);
  if (closesOn && !realDate(closesOn)) invalid("closesOn", "Use a real YYYY-MM-DD date.");
  const expectedResumption = text(input.expectedResumption, "expectedResumption", 10);
  if (expectedResumption && !realDate(expectedResumption)) invalid("expectedResumption", "Use a real YYYY-MM-DD date.");
  const about = text(input.about, "about", 20000);
  const responsibilities = texts(input.responsibilities, "responsibilities", 40, 500);
  const essential = texts(input.essential, "essential", 40, 500);
  const preferred = texts(input.preferred, "preferred", 40, 500);
  const skills = texts(input.skills, "skills", 50, 120);
  const exp = object(input.experience, "experience", ["minYears", "maxYears", "summary"]);
  const experience = {
    minYears: whole(exp.minYears, "experience.minYears", 0, 60),
    ...(exp.maxYears === null || exp.maxYears === undefined ? {} : { maxYears: whole(exp.maxYears, "experience.maxYears", 0, 60) }),
    summary: text(exp.summary, "experience.summary", 500),
  };
  if (experience.maxYears !== undefined && experience.maxYears < experience.minYears) invalid("experience.maxYears");
  const sal = object(input.salary, "salary", ["min", "max", "frequency", "negotiable", "visibility"]);
  const money = (value: unknown, path: string) => value === null ? null : whole(value, path, 0, 1_000_000_000);
  const salary = {
    min: money(sal.min, "salary.min"), max: money(sal.max, "salary.max"),
    frequency: pick(sal.frequency, "salary.frequency", ["Monthly", "Weekly", "Daily"] as const),
    negotiable: yesNo(sal.negotiable, "salary.negotiable"),
    visibility: pick(sal.visibility, "salary.visibility", ["public", "internal"] as const),
  };
  if (salary.min !== null && salary.max !== null && salary.max < salary.min) invalid("salary.max");
  if (salary.visibility === "public" && salary.min === null) invalid("salary.min", "A public range needs a minimum.");
  const benefits = array(input.benefits, "benefits", 30, (value, path) => {
    const benefit = object(value, path, ["id", "kind", "detail", "visibility"]);
    return { id: text(benefit.id, `${path}.id`, 100, true), kind: text(benefit.kind, `${path}.kind`, 80, true), detail: text(benefit.detail, `${path}.detail`, 500, true), visibility: pick(benefit.visibility, `${path}.visibility`, ["public", "internal"] as const) };
  });
  const cond = object(input.conditions, "conditions", ["workingDays", "shiftSystem", "hours", "weekends", "publicHolidays"]);
  const conditions = {
    workingDays: text(cond.workingDays, "conditions.workingDays", 300),
    shiftSystem: text(cond.shiftSystem, "conditions.shiftSystem", 300),
    hours: text(cond.hours, "conditions.hours", 300),
    weekends: text(cond.weekends, "conditions.weekends", 300),
    publicHolidays: text(cond.publicHolidays, "conditions.publicHolidays", 300),
  };
  const docs = object(input.requiredDocuments, "requiredDocuments", ["atApplication", "afterSelection"]);
  const requiredDocuments = { atApplication: texts(docs.atApplication, "requiredDocuments.atApplication", 30, 150), afterSelection: texts(docs.afterSelection, "requiredDocuments.afterSelection", 30, 150) };
  const screeningQuestions = array(input.screeningQuestions, "screeningQuestions", 30, (value, path) => {
    const q = object(value, path, ["id", "text", "required", "answerType"]);
    return { id: text(q.id, `${path}.id`, 100, true), text: text(q.text, `${path}.text`, 1000, true), required: yesNo(q.required, `${path}.required`), answerType: pick(q.answerType, `${path}.answerType`, ["yes-no", "text"] as const) };
  });
  const interviewRaw = object(input.interview, "interview", ["method", "location"]);
  const interview = { method: text(interviewRaw.method, "interview.method", 100), location: text(interviewRaw.location, "interview.location", 200) };
  const testFormId = uuid(input.testFormId, "testFormId", true);
  let image: ValidatedVacancyInput["image"] = null;
  if (input.image !== undefined && input.image !== null) {
    const photo = object(input.image, "image", ["source", "ref", "alt"]);
    const source = pick(photo.source, "image.source", ["default", "library"] as const);
    const ref = text(photo.ref, "image.ref", 100);
    const alt = text(photo.alt, "image.alt", 200, true);
    if (source === "default" && ref || source === "library" && !/^[A-Za-z0-9_-]{1,100}$/.test(ref)) invalid("image.ref");
    image = { source, ref, alt };
  }
  const journey = array(input.journey, "journey", 20, (value, path) => {
    const step = object(value, path, ["id", "kind", "interview"]);
    const id = text(step.id, `${path}.id`, 100, true);
    const kind = pick(step.kind, `${path}.kind`, KINDS);
    if (kind !== "interview") {
      if (step.interview !== undefined) invalid(`${path}.interview`);
      return { id, kind };
    }
    const iv = object(step.interview, `${path}.interview`, ["stageName", "defaultMethod", "defaultMinutes", "criteria", "whoMayScore"]);
    const criteria = array(iv.criteria, `${path}.interview.criteria`, 20, (value, criterionPath) => {
      const criterion = object(value, criterionPath, ["id", "label", "scale", "weight"]);
      if (criterion.scale !== 5 && criterion.scale !== 10) invalid(`${criterionPath}.scale`);
      return { id: text(criterion.id, `${criterionPath}.id`, 100, true), label: text(criterion.label, `${criterionPath}.label`, 100, true), scale: criterion.scale as 5 | 10, weight: whole(criterion.weight, `${criterionPath}.weight`, 1, 5) };
    });
    const whoMayScore = array(iv.whoMayScore, `${path}.interview.whoMayScore`, 3, (value, rolePath) => pick(value, rolePath, ["hr_officer", "hr_manager", "operations"] as const));
    if (!criteria.length) invalid(`${path}.interview.criteria`);
    if (!whoMayScore.length || new Set(whoMayScore).size !== whoMayScore.length) invalid(`${path}.interview.whoMayScore`);
    return { id, kind, interview: { stageName: text(iv.stageName, `${path}.interview.stageName`, 100, true), defaultMethod: pick(iv.defaultMethod, `${path}.interview.defaultMethod`, ["in-person", "video", "phone"] as const), defaultMinutes: whole(iv.defaultMinutes, `${path}.interview.defaultMinutes`, 10, 240), criteria, whoMayScore } };
  });
  const kinds = journey.map(step => step.kind);
  const decision = kinds.indexOf("operations-decision");
  const offer = kinds.indexOf("offer");
  const onboarding = kinds.indexOf("onboarding");
  if (kinds[0] !== "application" || kinds.filter(kind => kind === "application").length !== 1 || decision < 0 || kinds.filter(kind => kind === "operations-decision").length !== 1 || offer >= 0 && offer < decision || onboarding >= 0 && (onboarding !== kinds.length - 1 || offer >= 0 && onboarding < offer)) invalid("journey");
  if (new Set(journey.map(step => step.id)).size !== journey.length || KINDS.filter(kind => kind !== "interview").some(kind => kinds.filter(entry => entry === kind).length > 1)) invalid("journey");
  if (screeningQuestions.length && !kinds.includes("screening-questions")) invalid("screeningQuestions");
  if (testFormId && !kinds.includes("test-or-form")) invalid("testFormId");
  if (requiredDocuments.atApplication.length && !kinds.includes("documents-at-application")) invalid("requiredDocuments.atApplication");
  if (requiredDocuments.afterSelection.length && !kinds.includes("documents-after-selection")) invalid("requiredDocuments.afterSelection");
  // Current form sends this display array. The write transaction must derive it from the validated journey.
  if (input.recruitmentProcess !== undefined) texts(input.recruitmentProcess, "recruitmentProcess", 20, 120);
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { title, department, clientId, outletId, location, employmentType, openings, recruiterId, closesOn, expectedResumption, about, responsibilities, essential, preferred, experience, skills, salary, benefits, conditions, requiredDocuments, screeningQuestions, testFormId, image, journey, interview } };
}
