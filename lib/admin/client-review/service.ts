/** ClientReviewService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { ClientReviewAdapter } from "./adapter";
import { mockClientReviewAdapter } from "./mock";

const adapter: ClientReviewAdapter = mockClientReviewAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeClientReview: ClientReviewAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listSubmissions: ClientReviewAdapter["listSubmissions"] = (q) => adapter.listSubmissions(q);
export const getSubmission: ClientReviewAdapter["getSubmission"] = (id) => adapter.getSubmission(id);
export const submitToClient: ClientReviewAdapter["submitToClient"] = (id, i) => adapter.submitToClient(id, i);
export const withdrawSubmission: ClientReviewAdapter["withdrawSubmission"] = (id, i) => adapter.withdrawSubmission(id, i);
export const recordFeedback: ClientReviewAdapter["recordFeedback"] = (id, i) => adapter.recordFeedback(id, i);
export const returnToShortlist: ClientReviewAdapter["returnToShortlist"] = (id, i) => adapter.returnToShortlist(id, i);
