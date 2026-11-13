import type { ClientAnalyticsAdapter } from "../adapter";
/** Unsupported Client business features must fail closed, never return preview records in production. */
export const unavailableClientAdapter: ClientAnalyticsAdapter = new Proxy({} as ClientAnalyticsAdapter, {
  get(_target, method) {
    if (method === "subscribe") return () => () => {};
    return () => Promise.reject(new Error("This feature is not available for your account yet."));
  },
});
