/**
 * Staff Warnings & Records, LIVE (/api/staff/workforce/warning-*, docs/contracts/day2-warnings-requests.sql, part A).
 * The person is the session; the browser sends only the record id. Labels are Beeliv-authored (severity and type).
 * Only relative imports so it can be unit-tested offline.
 */
import type { StaffRecord } from "./types";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const REASON: Record<string, string> = {
  invalid_transition: "This record has already been acknowledged or closed.",
};

async function call(action: string, body: Rec): Promise<Rec> {
  const res = await fetch(`/api/staff/workforce/${action}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = rec(await res.json().catch(() => null));
  if (j?.ok === true) return j;
  throw new Error(REASON[str(j?.reason)] ?? "We couldn't reach Beeliv. Please try again.");
}

/** issued -> open, acknowledged -> acknowledged, withdrawn -> closed. Acknowledgement is asked only while still issued. */
export function staffRecordOf(raw: unknown): StaffRecord | null {
  const w = rec(raw);
  if (!w || !str(w.id)) return null;
  const s = str(w.status);
  const status: StaffRecord["status"] = s === "acknowledged" ? "acknowledged" : s === "withdrawn" ? "closed" : "open";
  const label = [str(w.severity), str(w.type)].filter(Boolean).join(" · ");
  const summary = status === "closed" && str(w.withdrawnReason) ? `${str(w.details)} Withdrawn by Beeliv: ${str(w.withdrawnReason)}` : str(w.details);
  return { id: str(w.id), date: str(w.effectiveDate).slice(0, 10), type: label || "Record", status, summary, requiresAcknowledgement: w.requiresAck !== false && status === "open" };
}

export async function liveStaffRecords(): Promise<StaffRecord[]> {
  const r = await call("warning-mine", {});
  return (Array.isArray(r.items) ? r.items : []).map(staffRecordOf).filter((x): x is StaffRecord => !!x);
}

/** Acknowledges (no comment: the approved dialog has no comment field), then answers the fresh record. */
export async function liveAcknowledgeRecord(id: string): Promise<StaffRecord> {
  await call("warning-ack", { warningId: id });
  const fresh = (await liveStaffRecords()).find((x) => x.id === id);
  if (!fresh) throw new Error("We couldn't reach Beeliv. Please try again.");
  return fresh;
}
