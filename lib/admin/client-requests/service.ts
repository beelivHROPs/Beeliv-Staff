/** ClientRequestsService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { ClientRequestsAdapter } from "./adapter";
import { mockClientRequestsAdapter } from "./mock";

const adapter: ClientRequestsAdapter = mockClientRequestsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeClientRequests: ClientRequestsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listRequests: ClientRequestsAdapter["listRequests"] = (q) => adapter.listRequests(q);
export const getRequest: ClientRequestsAdapter["getRequest"] = (id) => adapter.getRequest(id);
export const assignRequest: ClientRequestsAdapter["assignRequest"] = (id, i) => adapter.assignRequest(id, i);
export const acknowledgeRequest: ClientRequestsAdapter["acknowledgeRequest"] = (id) => adapter.acknowledgeRequest(id);
export const markFulfilled: ClientRequestsAdapter["markFulfilled"] = (id, i) => adapter.markFulfilled(id, i);
export const declineRequest: ClientRequestsAdapter["declineRequest"] = (id, i) => adapter.declineRequest(id, i);
