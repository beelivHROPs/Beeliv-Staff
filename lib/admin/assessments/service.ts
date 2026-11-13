/** AssessmentsService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { AssessmentsAdapter } from "./adapter";
import { mockAssessmentsAdapter } from "./mock";

const adapter: AssessmentsAdapter = mockAssessmentsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeAssessments: AssessmentsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listAssessments: AssessmentsAdapter["listAssessments"] = (q) => adapter.listAssessments(q);
export const getAssessment: AssessmentsAdapter["getAssessment"] = (id) => adapter.getAssessment(id);
