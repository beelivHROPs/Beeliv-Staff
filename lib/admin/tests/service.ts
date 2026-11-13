/**
 * TestsService: the single door the hooks use. Delegates to the active adapter and adds NO business rules.
 * To go live: change the one `adapter` line. (The taker screens read the shared store in ./store directly for now.)
 */
import type { TestsAdapter } from "./adapter";
import { mockTestsAdapter } from "./mock";

const adapter: TestsAdapter = mockTestsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeTests: TestsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listForms: TestsAdapter["listForms"] = (q) => adapter.listForms(q);
export const getForm: TestsAdapter["getForm"] = (id) => adapter.getForm(id);
export const getFacets: TestsAdapter["getFacets"] = () => adapter.getFacets();
export const saveForm: TestsAdapter["saveForm"] = (i) => adapter.saveForm(i);
export const setFormStatus: TestsAdapter["setStatus"] = (id, s) => adapter.setStatus(id, s);
export const duplicateForm: TestsAdapter["duplicate"] = (id) => adapter.duplicate(id);
export const listResults: TestsAdapter["listResults"] = (id, q) => adapter.listResults(id, q);
export const getSummary: TestsAdapter["getSummary"] = (id) => adapter.getSummary(id);
export const getSubmission: TestsAdapter["getSubmission"] = (id) => adapter.getSubmission(id);
export const saveMarks: TestsAdapter["saveMarks"] = (id, m, r) => adapter.saveMarks(id, m, r);
