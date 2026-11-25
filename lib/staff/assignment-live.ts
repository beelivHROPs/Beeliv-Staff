/**
 * Staff "My Assignment", LIVE (POST /api/staff/workforce/my-assignment, docs/contracts/day1-assignment-client-shifts.sql).
 * Served: client, outlet, city, role, department, start / end dates. NOT served (so null / empty, never invented): client and
 * outlet ids, outlet public id, photo, tags, supervisor, Beeliv contact, work context, first-day briefing.
 * Only relative imports so it can be unit-tested offline.
 */
import type { StaffAssignment } from "./types";
import { errorFromReply, networkError } from "../shared/error-messages";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date, "YYYY-MM-DD". */
const todayLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function assignment(raw: Rec, current: boolean): StaffAssignment | null {
  const id = str(raw.id), startDate = str(raw.startDate);
  if (!id || !DATE.test(startDate)) return null;
  const endDate = current ? null : DATE.test(str(raw.endDate)) ? str(raw.endDate) : null;
  if (!current && !endDate) return null;
  return {
    id,
    // Derived from the served dates only: a placement that has not started yet is "upcoming"; a closed one "ended".
    status: current ? (startDate > todayLocal() ? "upcoming" : "active") : "ended",
    client: { id: "", name: str(raw.clientName) },
    outlet: { id: "", publicId: "", name: str(raw.outletName), location: current ? str(raw.city) : "", imageUrl: null },
    role: str(raw.role),
    department: str(raw.department),
    tags: [],
    supervisor: null,
    beelivContact: null,
    startDate,
    endDate,
    context: null,
    firstDay: null,
  };
}

export type LiveAssignments = { current: StaffAssignment | null; history: StaffAssignment[] };

async function load(): Promise<LiveAssignments> {
  let res: Response;
  try {
    res = await fetch("/api/staff/workforce/my-assignment", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}" });
  } catch {
    throw networkError();
  }
  const j = rec(await res.json().catch(() => null));
  if (j?.ok !== true) throw errorFromReply(j);
  const c = rec(j.current);
  const current = c ? assignment(c, true) : null;
  const past = (Array.isArray(j.history) ? j.history : []).map((h) => rec(h)).flatMap((h) => (h ? [assignment(h, false)] : [])).filter((a): a is StaffAssignment => !!a);
  // History lists the current placement too (the page's timeline marks it "Current"), newest first.
  return { current, history: current ? [current, ...past] : past };
}

let inflight: { at: number; p: Promise<LiveAssignments> } | null = null;
/** One request serves the top bar, Home and the page together (a few seconds); a failed load is retried next time. */
export function liveAssignments(): Promise<LiveAssignments> {
  if (inflight && Date.now() - inflight.at < 5_000) return inflight.p;
  const p = load();
  inflight = { at: Date.now(), p };
  p.catch(() => {
    if (inflight?.p === p) inflight = null;
  });
  return p;
}

/** Test helper: forget the shared request. */
export function resetLiveAssignments() {
  inflight = null;
}
