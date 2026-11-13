/** InterviewsService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { InterviewsAdapter } from "./adapter";
import { mockInterviewsAdapter } from "./mock";

const adapter: InterviewsAdapter = mockInterviewsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeInterviews: InterviewsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listInterviews: InterviewsAdapter["listInterviews"] = (q) => adapter.listInterviews(q);
export const getInterview: InterviewsAdapter["getInterview"] = (id) => adapter.getInterview(id);
export const checkConflicts: InterviewsAdapter["checkConflicts"] = (q) => adapter.checkConflicts(q);
export const scheduleInterview: InterviewsAdapter["scheduleInterview"] = (id, i) => adapter.scheduleInterview(id, i);
export const rescheduleInterview: InterviewsAdapter["rescheduleInterview"] = (id, i) => adapter.rescheduleInterview(id, i);
export const cancelInterview: InterviewsAdapter["cancelInterview"] = (id, i) => adapter.cancelInterview(id, i);
export const saveScorecard: InterviewsAdapter["saveScorecard"] = (id, i) => adapter.saveScorecard(id, i);
