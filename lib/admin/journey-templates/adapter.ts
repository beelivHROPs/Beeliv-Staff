/**
 * Replaceable contract for job templates: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). Writes are Operations and HR
 * Manager only (capability journeyTemplates.manage); the backend must enforce
 * that and write an audit record for every change.
 */
import type { AdapterEvent } from "../adapter";
import type { JourneyTemplate, TemplateInput } from "./types";

export interface JourneyTemplatesAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  /** Active templates first, then archived. Anyone who can create a vacancy may read them. */
  listTemplates(): Promise<JourneyTemplate[]>;
  getTemplate(id: string): Promise<JourneyTemplate | null>;
  /** Throws TemplateValidationError on bad input, RestrictedError when the role may not manage templates. */
  createTemplate(input: TemplateInput): Promise<JourneyTemplate>;
  updateTemplate(id: string, input: TemplateInput): Promise<JourneyTemplate>;
  /** Copy with a new id and "(copy)" name. */
  duplicateTemplate(id: string): Promise<JourneyTemplate>;
  /** The "delete": hides it from the picker, keeps it for history. */
  setArchived(id: string, archived: boolean): Promise<JourneyTemplate>;
}
