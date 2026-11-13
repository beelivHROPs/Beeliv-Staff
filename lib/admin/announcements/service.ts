/**
 * AnnouncementService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { AnnouncementAdapter } from "./adapter";
import { mockAnnouncementAdapter } from "./mock";

const adapter: AnnouncementAdapter = mockAnnouncementAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeAnnouncements: AnnouncementAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getConfig: AnnouncementAdapter["getConfig"] = () => adapter.getConfig();
export const listAnnouncements: AnnouncementAdapter["list"] = (q) => adapter.list(q);
export const getAnnouncement: AnnouncementAdapter["get"] = (id) => adapter.get(id);
export const createAnnouncement: AnnouncementAdapter["create"] = (i, n) => adapter.create(i, n);
export const updateAnnouncement: AnnouncementAdapter["update"] = (id, i, n) => adapter.update(id, i, n);
export const performAnnouncement: AnnouncementAdapter["perform"] = (id, a) => adapter.perform(id, a);
