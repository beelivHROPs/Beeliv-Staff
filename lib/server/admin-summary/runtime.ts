import "server-only";
import { authConfig } from "../auth/config";
import { sessionClient } from "../auth/session";
import { hasAccess, readAccess } from "../auth/policy";
import { limitAuth, RateFailure, rejectRpcRateLimit } from "../auth/rate";
import { listInvitations } from "../auth/invitation-management";
import { orgRecordsEnabled, orgRecordsRuntime } from "../org-records/runtime";
import { getClient, listClients, listStaff } from "../org-records/service";
import { staffDocumentationRuntime } from "../staff-documentation/runtime";
import { hrQueue } from "../staff-documentation/service";
import type { SummaryDependencies } from "./service";

export function adminSummaryRuntime(): { deps: SummaryDependencies; origin: string } {
  // Reuse installed read readiness; writes, storage and mail are not prerequisites.
  const enabled = orgRecordsEnabled();
  const off = async (): Promise<never> => { throw new Error("unavailable"); };
  if (!enabled) return { origin: "", deps: { enabled: false, authorize: off, consumeLimit: off, staff: off, clients: off, client: off, documents: off, invitations: off, now: () => new Date() } };
  const org = orgRecordsRuntime().deps;
  return {
    origin: authConfig("admin").origin,
    deps: {
      enabled, now: () => new Date(),
      authorize: async () => {
        const who = await org.verifyAdmin();
        if (!who || who.aal !== "aal2") return who;
        const client = await sessionClient("admin");
        const { data, error } = await client.rpc("auth_access_context", { p_app: "admin" });
        if (error) throw new Error("unavailable");
        try { rejectRpcRateLimit(data); } catch (e) { if (e instanceof RateFailure) throw { code: "rate_limited" }; throw e; }
        if (!hasAccess(readAccess(data, "admin"))) throw { code: "forbidden" };
        return who;
      },
      consumeLimit: async (uid) => {
        try { await limitAuth("admin", "invite_manage_read", `admin-summary:${uid}`); }
        catch (e) { if (e instanceof RateFailure) throw { code: "rate_limited" }; throw e; }
      },
      staff: (show) => listStaff({ show, page: 1, pageSize: 1 }, org),
      clients: (page, status) => listClients({ page, status, pageSize: 50 }, org),
      client: (clientId, outletsAfter) => getClient({ clientId, outletsAfter, outletsLimit: 200 }, org),
      documents: async () => hrQueue({ state: "available", page: 1, pageSize: 1 }, staffDocumentationRuntime("admin").deps),
      invitations: (after) => listInvitations({ portal: "admin", status: "pending", limit: 100, after }),
    },
  };
}


