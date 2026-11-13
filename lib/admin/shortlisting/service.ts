/** ShortlistingService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { ShortlistingAdapter } from "./adapter";
import { mockShortlistingAdapter } from "./mock";

const adapter: ShortlistingAdapter = mockShortlistingAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeShortlisting: ShortlistingAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listCandidates: ShortlistingAdapter["listCandidates"] = (q) => adapter.listCandidates(q);
export const bulkAction: ShortlistingAdapter["bulkAction"] = (ids, i) => adapter.bulkAction(ids, i);
