/**
 * AdminService: the single door the hooks use. Delegates to the active adapter
 * and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { AdminAdapter } from "./adapter";
import { mockAdminAdapter } from "./adapters/mock";
import { getAdminRole } from "./ops/identity";
import { reacceptNotes, subscribeReaccept } from "@/lib/reaccept/store";
import { fromAdmin } from "@/lib/notifications/adapters";
import type { SharedNotification } from "@/lib/notifications/types";

const adapter: AdminAdapter = mockAdminAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeAdmin: AdminAdapter["subscribe"] = (l) => {
  const a = adapter.subscribe(l);
  const b = subscribeReaccept(() => l("reset"));
  return () => {
    a();
    b();
  };
};

export const getSession = () => adapter.getSession();
export const getHrOverview = () => adapter.getHrOverview();
// Re-acceptance entries are a preview fixture (lib/reaccept/store.ts); empty unless the demo flag is on.
export const getNotifications = async () => [...reacceptNotes("admin", getAdminRole() === "ops").map((n) => ({ id: n.id, kind: "agreement.reacceptance" as const, title: n.title, message: n.message, createdAt: n.createdAt, read: n.read, href: "/admin" })), ...(await adapter.getNotifications())];
/** The same notifications in the shared shape (lib/notifications/types.ts), through the small adapter. */
export const getSharedNotifications = async (): Promise<SharedNotification[]> => (await getNotifications()).map(fromAdmin);
export const getNavCounts = () => adapter.getNavCounts();
