/** GlanceService: the single door the hooks use. Adds NO business rules. To go live: change the one `adapter` line. */
import type { GlanceAdapter } from "./adapter";
import { mockGlanceAdapter } from "./mock";

const adapter: GlanceAdapter = mockGlanceAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeGlance: GlanceAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getGlance: GlanceAdapter["getGlance"] = (s) => adapter.getGlance(s);
export { getPreviewScope, setPreviewScope, subscribePreviewScope } from "./mock";
