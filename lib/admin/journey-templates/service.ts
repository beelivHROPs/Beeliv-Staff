/** JourneyTemplatesService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { JourneyTemplatesAdapter } from "./adapter";
import { mockJourneyTemplatesAdapter } from "./mock";

const adapter: JourneyTemplatesAdapter = mockJourneyTemplatesAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeTemplates: JourneyTemplatesAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listTemplates: JourneyTemplatesAdapter["listTemplates"] = () => adapter.listTemplates();
export const getTemplate: JourneyTemplatesAdapter["getTemplate"] = (id) => adapter.getTemplate(id);
export const createTemplate: JourneyTemplatesAdapter["createTemplate"] = (i) => adapter.createTemplate(i);
export const updateTemplate: JourneyTemplatesAdapter["updateTemplate"] = (id, i) => adapter.updateTemplate(id, i);
export const duplicateTemplate: JourneyTemplatesAdapter["duplicateTemplate"] = (id) => adapter.duplicateTemplate(id);
export const setTemplateArchived: JourneyTemplatesAdapter["setArchived"] = (id, a) => adapter.setArchived(id, a);
