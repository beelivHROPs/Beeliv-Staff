/**
 * DEV FIXTURE for job templates. Everything is FICTIONAL. In memory only: a reload
 * resets it. Replace with a Supabase adapter implementing JourneyTemplatesAdapter;
 * no screen changes.
 *
 * Rules that live HERE (backend rules in production, not UI rules):
 *  - only roles holding journeyTemplates.manage (Operations, HR Manager) may write;
 *  - a template name is required, at most 60 characters, and unique among active templates;
 *  - the journey must follow the fixed ordering rules (lib/journeys/types.ts);
 *  - "delete" archives, it never removes (vacancies keep their own copy anyway).
 */
import { canDo } from "../role-access";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/public-site/job-details";
import { SAMPLE_JOURNEYS } from "@/lib/journeys/samples";
import { copyJourney, validateJourney } from "@/lib/journeys/types";
import type { JourneyTemplatesAdapter } from "./adapter";
import { TemplateValidationError, type JourneyTemplate, type TemplateFieldErrors, type TemplateInput } from "./types";

const ACTOR = "Funke Sample";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const listeners = new Set<(e: AdapterEvent) => void>();
const emit = () => listeners.forEach((l) => l("reset"));

const docs = () => ({ atApplication: [...DEFAULT_REQUIRED_DOCUMENTS.atApplication], afterSelection: [...DEFAULT_REQUIRED_DOCUMENTS.afterSelection] });

function seed(): JourneyTemplate[] {
  const at = new Date().toISOString();
  return [
    {
      id: "jt-sample-front",
      name: "Front of house",
      description: "Sample template. Phone screen, a video interview and a short test. Edit it to match how Beeliv works.",
      archived: false,
      sample: true,
      updatedAt: at,
      updatedBy: "Sample data",
      journey: SAMPLE_JOURNEYS.front(),
      documents: docs(),
      screeningQuestions: [
        { id: "jt-f-q1", text: "Do you have experience in a guest-facing role?", required: true, answerType: "yes-no" },
        { id: "jt-f-q2", text: "Can you work weekends and public holidays?", required: true, answerType: "yes-no" },
        { id: "jt-f-q3", text: "Tell us briefly why you want this role.", required: false, answerType: "text" },
      ],
      testFormId: "form-training-test",
      about: "Sample copy. You will welcome guests, take orders accurately and help the outlet deliver a consistent guest experience.",
    },
    {
      id: "jt-sample-kitchen",
      name: "Kitchen",
      description: "Sample template. Phone screen, an interview and a kitchen practical, with documents asked after selection.",
      archived: false,
      sample: true,
      updatedAt: at,
      updatedBy: "Sample data",
      journey: SAMPLE_JOURNEYS.kitchen(),
      documents: { atApplication: ["CV", "Passport photograph", "Valid ID"], afterSelection: ["Food handler certificate", "Guarantor information", "Reference letter"] },
      screeningQuestions: [
        { id: "jt-k-q1", text: "Do you have food safety training?", required: true, answerType: "yes-no" },
        { id: "jt-k-q2", text: "Can you work late closing shifts?", required: true, answerType: "yes-no" },
      ],
    },
  ];
}

let store: JourneyTemplate[] = seed();
let counter = 0;

function guardWrite() {
  if (!canDo("journeyTemplates.manage")) throw new RestrictedError("Only Operations and the HR Manager can manage job templates.");
}

function validate(input: TemplateInput, selfId: string | null): TemplateFieldErrors {
  const e: TemplateFieldErrors = {};
  const name = input.name.trim();
  if (!name) e.name = "Enter a name for the template.";
  else if (name.length > 60) e.name = "Keep the name under 60 characters.";
  else if (store.some((t) => t.id !== selfId && !t.archived && t.name.trim().toLowerCase() === name.toLowerCase())) e.name = "Another template already has that name.";
  Object.assign(e, validateJourney(input.journey));
  if (input.screeningQuestions.some((q) => !q.text.trim())) e.questions = "Write each screening question, or remove the empty one.";
  return e;
}

const clean = (input: TemplateInput) => ({
  ...structuredClone(input),
  name: input.name.trim(),
  description: input.description.trim(),
  about: input.about?.trim() || undefined,
  testFormId: input.testFormId || undefined,
  screeningQuestions: input.screeningQuestions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim() })),
});

export const mockJourneyTemplatesAdapter: JourneyTemplatesAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listTemplates() {
    await sleep(200);
    return structuredClone([...store.filter((t) => !t.archived), ...store.filter((t) => t.archived)]);
  },

  async getTemplate(id) {
    await sleep(200);
    const t = store.find((x) => x.id === id);
    return t ? structuredClone(t) : null;
  },

  async createTemplate(input) {
    await sleep(300);
    guardWrite();
    const errors = validate(input, null);
    if (Object.keys(errors).length) throw new TemplateValidationError(errors);
    const t: JourneyTemplate = { ...clean(input), id: `jt-${++counter}-${Date.now().toString(36)}`, archived: false, sample: false, updatedAt: new Date().toISOString(), updatedBy: ACTOR };
    store = [...store, t];
    emit();
    return structuredClone(t);
  },

  async updateTemplate(id, input) {
    await sleep(300);
    guardWrite();
    const cur = store.find((x) => x.id === id);
    if (!cur) throw new Error("Template not found");
    const errors = validate(input, id);
    if (Object.keys(errors).length) throw new TemplateValidationError(errors);
    const next: JourneyTemplate = { ...cur, ...clean(input), updatedAt: new Date().toISOString(), updatedBy: ACTOR };
    store = store.map((x) => (x.id === id ? next : x));
    emit();
    return structuredClone(next);
  },

  async duplicateTemplate(id) {
    await sleep(250);
    guardWrite();
    const cur = store.find((x) => x.id === id);
    if (!cur) throw new Error("Template not found");
    let name = `${cur.name} (copy)`;
    let n = 2;
    while (store.some((t) => !t.archived && t.name.toLowerCase() === name.toLowerCase())) name = `${cur.name} (copy ${n++})`;
    const t: JourneyTemplate = { ...structuredClone(cur), journey: copyJourney(cur.journey), id: `jt-${++counter}-${Date.now().toString(36)}`, name, archived: false, sample: false, updatedAt: new Date().toISOString(), updatedBy: ACTOR };
    store = [...store, t];
    emit();
    return structuredClone(t);
  },

  async setArchived(id, archived) {
    await sleep(250);
    guardWrite();
    const cur = store.find((x) => x.id === id);
    if (!cur) throw new Error("Template not found");
    if (!archived && store.some((t) => t.id !== id && !t.archived && t.name.toLowerCase() === cur.name.toLowerCase())) throw new TemplateValidationError({ name: "Another template already has that name." });
    const next = { ...cur, archived, updatedAt: new Date().toISOString(), updatedBy: ACTOR };
    store = store.map((x) => (x.id === id ? next : x));
    emit();
    return structuredClone(next);
  },
};
