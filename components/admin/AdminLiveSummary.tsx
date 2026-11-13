"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Live Admin Home numbers from GET /api/admin/summary (Codex, docs/contracts/admin-home-summary.md). Read-only and scoped
 * to the signed-in Admin. A metric that is restricted or unavailable shows a dash with a reason, NEVER a zero.
 * Manual refresh only (reads use database quotas; no polling).
 */
type Metric = { status: "available"; count: number } | { status: "restricted" | "unavailable"; count: null };
type Summary = { generatedAt: string; staffPlaced: Metric; staffUnplaced: Metric; activeClients: Metric; activeOutlets: Metric; documentsAwaitingHr: Metric; pendingInvitations: Metric };

const TILES: { key: Exclude<keyof Summary, "generatedAt">; label: string }[] = [
  { key: "staffPlaced", label: "Staff placed" },
  { key: "staffUnplaced", label: "Staff not yet placed" },
  { key: "activeClients", label: "Active clients" },
  { key: "activeOutlets", label: "Active outlets" },
  { key: "documentsAwaitingHr", label: "Documents awaiting review" },
  { key: "pendingInvitations", label: "Pending invitations" },
];

function isMetric(v: unknown): v is Metric {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (m.status === "available" && typeof m.count === "number" && Number.isSafeInteger(m.count) && m.count >= 0) || ((m.status === "restricted" || m.status === "unavailable") && m.count === null);
}

export function AdminLiveSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed" | "wait">("loading");

  // Fetch only; state is applied in the promise callback (never synchronously inside the effect).
  const fetchSummary = useCallback(async (): Promise<{ state: "ready"; value: Summary } | { state: "failed" | "wait" }> => {
    try {
      const res = await fetch("/api/admin/summary", { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
      if (res.status === 429) return { state: "wait" };
      const body = (await res.json()) as { ok?: boolean; value?: Record<string, unknown> };
      const v = body?.value;
      if (!res.ok || body?.ok !== true || !v || typeof v.generatedAt !== "string" || !TILES.every((t) => isMetric(v[t.key]))) return { state: "failed" };
      return { state: "ready", value: v as unknown as Summary };
    } catch {
      return { state: "failed" };
    }
  }, []);

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchSummary>>) => {
    if (r.state === "ready") setData(r.value);
    setState(r.state);
  }, []);

  const load = useCallback(() => {
    setState("loading");
    void fetchSummary().then(apply);
  }, [fetchSummary, apply]);

  useEffect(() => {
    let live = true;
    void fetchSummary().then((r) => {
      if (live) apply(r);
    });
    return () => {
      live = false;
    };
  }, [fetchSummary, apply]);

  return (
    <section aria-labelledby="live-summary-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="live-summary-title" className="text-[17px] font-semibold" style={{ color: "var(--ap-ink)" }}>
          At a glance
        </h2>
        <button type="button" onClick={load} disabled={state === "loading"} className="ap-btn ap-btn-s ap-btn-sm min-h-11">
          {state === "loading" ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {state === "failed" || state === "wait" ? (
        <p role="status" className="ap-card p-4 text-[15px]" style={{ color: "var(--ap-muted)" }}>
          {state === "wait" ? "Too many refreshes just now. Please wait a minute, then try again." : "We couldn't load these numbers right now. Please try again."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-3" aria-busy={state === "loading"}>
          {TILES.map((t) => {
            const m = data?.[t.key];
            return (
              <li key={t.key} className="ap-card flex flex-col gap-1 p-4">
                <span className="text-[13px]" style={{ color: "var(--ap-muted)" }}>{t.label}</span>
                {!m ? (
                  <span className="h-7 w-10 animate-pulse rounded-md motion-reduce:animate-none" style={{ background: "var(--ap-tint-soft)" }} aria-hidden="true" />
                ) : m.status === "available" ? (
                  <span className="text-[26px] font-semibold tabular-nums" style={{ color: "var(--ap-ink)" }}>{m.count}</span>
                ) : (
                  <span className="text-[15px]" style={{ color: "var(--ap-muted)" }}>
                    <span aria-hidden="true">— </span>
                    {m.status === "restricted" ? "Not in your access" : "Not available"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
