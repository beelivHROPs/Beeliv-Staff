/**
 * ContentService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { ContentAdapter } from "./adapter";
import { mockContentAdapter } from "./mock";

const adapter: ContentAdapter = mockContentAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeContent: ContentAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getConfig: ContentAdapter["getConfig"] = () => adapter.getConfig();
export const listContent: ContentAdapter["list"] = (q) => adapter.list(q);
export const getContent: ContentAdapter["get"] = (id) => adapter.get(id);
export const createContent: ContentAdapter["create"] = (i, n) => adapter.create(i, n);
export const updateContent: ContentAdapter["update"] = (id, i, n) => adapter.update(id, i, n);
export const performContent: ContentAdapter["perform"] = (id, i) => adapter.perform(id, i);
