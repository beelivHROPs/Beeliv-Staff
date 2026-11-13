/**
 * ApplicantsService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { ApplicantsAdapter } from "./adapter";
import { mockApplicantsAdapter } from "./mock";

const adapter: ApplicantsAdapter = mockApplicantsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeApplicants: ApplicantsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listApplicants: ApplicantsAdapter["listApplicants"] = (q) => adapter.listApplicants(q);
export const getApplicant: ApplicantsAdapter["getApplicant"] = (id) => adapter.getApplicant(id);
export const performAction: ApplicantsAdapter["performAction"] = (id, input) => adapter.performAction(id, input);
export const addNote: ApplicantsAdapter["addNote"] = (id, body) => adapter.addNote(id, body);
