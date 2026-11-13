/**
 * Job (journey) templates. Beeliv writes these (Operations and HR Manager);
 * a new vacancy COPIES one, so editing or archiving a template later never
 * changes a vacancy that already exists (docs/contracts/interviews-and-application-journeys.md
 * sections 1.5 and 2). A template holds the application setup (journey,
 * documents, screening questions, optional test) and, optionally, description
 * text. Whether templates hold description text at all needs Beeliv confirmation.
 * All content is FICTIONAL sample.
 */
import type { ISODateTime } from "../types";
import type { Journey } from "@/lib/journeys/types";
import type { ScreeningQuestion } from "../vacancies/types";

export interface TemplateContent {
  journey: Journey;
  documents: { atApplication: string[]; afterSelection: string[] };
  screeningQuestions: ScreeningQuestion[];
  /** Id of a published test; empty/undefined = none. */
  testFormId?: string;
  /** Optional description text. Copied into a new vacancy only when present. */
  about?: string;
}

export interface JourneyTemplate extends TemplateContent {
  id: string;
  name: string;
  /** Internal note for Beeliv staff; never shown to applicants. */
  description: string;
  /** Archived templates cannot be picked for new vacancies; this is the "delete". */
  archived: boolean;
  /** Seeded example, labelled as such in the UI. */
  sample: boolean;
  updatedAt: ISODateTime;
  updatedBy: string;
}

export interface TemplateInput extends TemplateContent {
  name: string;
  description: string;
}

export type TemplateFieldErrors = Partial<Record<string, string>>;

/** Thrown by an adapter when the backend rejects the input. Keys: "name", "journey", or a journey step id. */
export class TemplateValidationError extends Error {
  fields: TemplateFieldErrors;
  constructor(fields: TemplateFieldErrors) {
    super("Template failed validation");
    this.name = "TemplateValidationError";
    this.fields = fields;
  }
}
