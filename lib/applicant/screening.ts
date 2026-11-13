/**
 * Role-specific pre-screening questions (docs/requirements/beeliv-recruitment-
 * and-job-listings-2026-09-29.md §2.11). The requirements say Beeliv HR should
 * be able to add these per vacancy; with no database or HR vacancy editor yet,
 * questions are mapped from a job's department (falling back to keywords in
 * the role title, for older applications whose listing is no longer live).
 *
 * - Bar  -> the document's own five Bartender questions.
 * - Kitchen -> the document's own five Chef questions.
 * - Front of house / Management / Admin & operations / Support ->
 *   SAMPLE questions written for this prototype - to be replaced by Beeliv's
 *   real questions. Option lists marked SAMPLE are likewise placeholders.
 *
 * Answers are stored on ApplyFormData.screeningAnswers keyed by question id,
 * so they stay part of the application record (§2.11).
 */
import type { ApplyFormData } from "./types";

export type ScreeningQuestionType = "yesno" | "single" | "multi" | "text" | "number";

export type ScreeningQuestion = {
  id: string;
  type: ScreeningQuestionType;
  title: string;
  required: boolean;
  /** single / multi only. */
  options?: string[];
  placeholder?: string;
  /** number only - shown after the field, e.g. "years". */
  unit?: string;
};

export type ScreeningAnswers = Record<string, string | string[]>;

export type ScreeningSetKey = "bar" | "kitchen" | "frontOfHouse" | "management" | "admin" | "support";

/** Same four bands the previous hard-coded covers question used. */
const COVERS_OPTIONS = ["Under 50", "50 – 150", "150 – 300", "Over 300"];

export const SCREENING_SETS: Record<ScreeningSetKey, ScreeningQuestion[]> = {
  // §2.11 Bartender, verbatim question wording.
  bar: [
    { id: "bar-years", type: "number", title: "How many years of bartending experience do you have?", required: true, unit: "years" },
    { id: "bar-pos", type: "text", title: "Which POS systems have you used?", required: false, placeholder: "List any you have used, or write “None”" },
    { id: "bar-classics", type: "yesno", title: "Can you prepare classic cocktails?", required: true },
    { id: "bar-inventory", type: "yesno", title: "Do you have experience with inventory?", required: true },
    { id: "bar-evenings", type: "yesno", title: "Are you available for evening shifts?", required: true },
  ],
  // §2.11 Chef, verbatim question wording. Option lists are SAMPLE, drawn from §2 "Skills: Kitchen".
  kitchen: [
    {
      id: "chef-section",
      type: "single",
      title: "What section are you strongest in?",
      required: true,
      options: ["Grill", "Pastry", "Sushi", "Butchery", "Food preparation", "Other"],
    },
    { id: "chef-covers", type: "single", title: "How many covers have you handled during peak service?", required: true, options: COVERS_OPTIONS },
    {
      id: "chef-cuisines",
      type: "multi",
      title: "Which cuisines are you experienced in?",
      required: false,
      options: ["Continental", "Nigerian cuisine", "Asian cuisine", "Pastry", "Sushi", "Other"],
    },
    { id: "chef-food-safety", type: "yesno", title: "Do you have food safety training?", required: true },
    { id: "chef-costing", type: "yesno", title: "Can you work with standardized recipes and food costing?", required: true },
  ],
  // SAMPLE - to be replaced by Beeliv's real questions.
  frontOfHouse: [
    { id: "foh-years", type: "number", title: "How many years have you worked in a guest-facing hospitality role?", required: true, unit: "years" },
    {
      id: "foh-service",
      type: "single",
      title: "Which type of service are you most experienced in?",
      required: true,
      options: ["Restaurant", "Fine dining", "Hotel", "Lounge / bar", "QSR", "Other"],
    },
    { id: "foh-pos", type: "yesno", title: "Have you used a POS system to take orders or process bills?", required: true },
    { id: "foh-complaint", type: "text", title: "Briefly describe how you handled a guest complaint.", required: false, placeholder: "Two or three sentences is enough" },
  ],
  // SAMPLE - to be replaced by Beeliv's real questions. Options from §2 "Skills: Management".
  management: [
    { id: "mgmt-years", type: "number", title: "How many years have you supervised or managed a hospitality team?", required: true, unit: "years" },
    { id: "mgmt-team", type: "single", title: "What is the largest team you have supervised?", required: true, options: ["1 – 5", "6 – 15", "16 – 30", "Over 30"] },
    {
      id: "mgmt-areas",
      type: "multi",
      title: "Which of these have you been responsible for?",
      required: false,
      options: ["Staff supervision", "Inventory", "Cost control", "Scheduling", "Reporting", "Guest complaint resolution"],
    },
    { id: "mgmt-late", type: "yesno", title: "Can you work late closing shifts (for example until 11:30 PM)?", required: true },
  ],
  // SAMPLE - to be replaced by Beeliv's real questions.
  admin: [
    { id: "adm-years", type: "number", title: "How many years of admin or operations experience do you have?", required: true, unit: "years" },
    {
      id: "adm-tools",
      type: "multi",
      title: "Which of these are you confident with?",
      required: false,
      options: ["Spreadsheets", "Staff records", "Stock / inventory records", "Rotas and scheduling", "Daily reports"],
    },
    { id: "adm-hospitality", type: "yesno", title: "Have you worked in a hospitality business before?", required: true },
  ],
  // SAMPLE - to be replaced by Beeliv's real questions.
  support: [
    { id: "sup-years", type: "number", title: "How many years of experience do you have in this type of role?", required: true, unit: "years" },
    { id: "sup-hospitality", type: "yesno", title: "Have you worked in a hotel, restaurant or lounge before?", required: true },
    { id: "sup-shifts", type: "yesno", title: "Are you available for early, late and weekend shifts?", required: true },
  ],
};

const DEPARTMENT_SET: Record<string, ScreeningSetKey> = {
  Bar: "bar",
  Kitchen: "kitchen",
  "Front of house": "frontOfHouse",
  Management: "management",
  "Admin & operations": "admin",
  Support: "support",
};

/**
 * Keyword fallback for records without a department (e.g. an application
 * whose listing has closed). Ordered so every current listing's role title
 * resolves to the same set its department does.
 */
function setFromRole(role: string): ScreeningSetKey {
  const r = role.toLowerCase();
  if (/\b(bar|bartender|mixolog|barback)/.test(r)) return "bar";
  if (/\b(chef|cook|kitchen|pastry|sushi|commis)/.test(r)) return "kitchen";
  if (/\b(cleaner|steward|security|driver|housekeep)/.test(r)) return "support";
  if (/\b(admin|operations|inventory|store|hr)\b/.test(r)) return "admin";
  if (/\b(manager|supervisor|captain)/.test(r)) return "management";
  return "frontOfHouse";
}

export function screeningSetFor(job: { role: string; department?: string | null }): ScreeningSetKey {
  return (job.department && DEPARTMENT_SET[job.department]) || setFromRole(job.role);
}

export function screeningQuestionsFor(job: { role: string; department?: string | null }): ScreeningQuestion[] {
  return SCREENING_SETS[screeningSetFor(job)];
}

/**
 * The saved answers for a form. Drafts saved before per-role questions
 * existed only have the deprecated screeningQ1–3 fields (the old, chef-only
 * questions) - those are carried over into the matching Chef questions so a
 * resumed kitchen draft keeps its answers; they are ignored for other roles.
 */
export function readScreeningAnswers(form: ApplyFormData, questions: ScreeningQuestion[]): ScreeningAnswers {
  if (form.screeningAnswers) return form.screeningAnswers;
  const out: ScreeningAnswers = {};
  const ids = new Set(questions.map((q) => q.id));
  if (ids.has("chef-food-safety") && form.screeningQ1) out["chef-food-safety"] = form.screeningQ1;
  if (ids.has("chef-covers") && form.screeningQ2) out["chef-covers"] = form.screeningQ2;
  return out;
}

export function isAnswered(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value && value.trim());
}

/** 1-based numbers of required questions still unanswered. */
export function missingRequiredQuestions(questions: ScreeningQuestion[], answers: ScreeningAnswers): number[] {
  return questions.flatMap((q, i) => (q.required && !isAnswered(answers[q.id]) ? [i + 1] : []));
}

export function answeredCount(questions: ScreeningQuestion[], answers: ScreeningAnswers): number {
  return questions.filter((q) => isAnswered(answers[q.id])).length;
}

/** Display string for one answer ("Not answered" when blank). */
export function formatScreeningAnswer(q: ScreeningQuestion, value: string | string[] | undefined): string {
  if (!isAnswered(value)) return "Not answered";
  if (Array.isArray(value)) return value.join(", ");
  if (q.type === "number" && q.unit) return `${value} ${Number(value) === 1 ? q.unit.replace(/s$/, "") : q.unit}`;
  return value!.trim();
}
