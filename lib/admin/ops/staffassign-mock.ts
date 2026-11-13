/**
 * DEV FIXTURE for Operations "Staff Assignments". FICTIONAL. Data lives in
 * `workforce-store.ts` (shared with Clients & Outlets). Rules here are
 * PROVISIONAL mock behaviour and need Beeliv confirmation: approval of a
 * reassignment (applied immediately here), who is notified (nobody), whether a
 * past or future effective date is allowed (not before the current placement's
 * start date here), and whether Operations may unassign (not offered).
 * Replace with a Supabase adapter implementing OpsStaffAssignAdapter.
 *
 * Previews: ?state=restricted (403), ?state=conflict (the first reassignment
 * you save is refused because someone else moved that person first), the
 * shell's "Prototype state" control (loading / empty / error).
 */
import { RestrictedError } from "../adapter";
import { getPrototypeMode } from "../dev-controls";
import { getRoles } from "../lists/store";
import { ConflictError } from "./adapter";
import type { OpsStaffAssignAdapter } from "./staffassign-adapter";
import type { OpsStaffDetail, OpsStaffRow, ReassignInput } from "./staffassign-types";
import { allClients, allStaff, currentOf, docStates, ME, staffById, subscribeWorkforce, writeOtherChange, writePlacement, type StaffRec } from "./workforce-store";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));
let conflictSpent = false;

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (urlState() === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(280);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const rowOf = (r: StaffRec): OpsStaffRow => {
  const cur = currentOf(r);
  return {
    id: r.id,
    reference: r.reference,
    name: r.name,
    status: r.status,
    current: cur ? { ...cur } : null,
    previousCount: r.placements.filter((p) => !p.current).length,
    revision: r.revision,
  };
};

function detailOf(r: StaffRec): OpsStaffDetail {
  const items = docStates(r.docIdx);
  return {
    ...rowOf(r),
    history: r.placements.filter((p) => !p.current).map((p) => ({ ...p })),
    documents: {
      verified: items.filter((d) => d.state === "verified").length,
      total: items.length,
      needAttention: items.filter((d) => d.state === "missing" || d.state === "needs-review" || d.state === "resubmitted" || d.state === "rejected").length,
      items,
    },
    options: { clients: allClients(), roles: getRoles(true).map((x) => x.name) },
  };
}

export const mockOpsStaffAssignAdapter: OpsStaffAssignAdapter = {
  subscribe: subscribeWorkforce,

  async listStaff(q) {
    const mode = await gate();
    const all = mode === "empty" ? [] : allStaff().map(rowOf);
    const needle = q.search.trim().toLowerCase();
    const base = all.filter((r) => (!needle || [r.name, r.current?.client ?? "", r.current?.outlet ?? "", r.current?.role ?? ""].some((s) => s.toLowerCase().includes(needle))) && (!q.clientId || r.current?.clientId === q.clientId));
    const rows = base.filter((r) => q.show === "all" || r.current === null).sort((a, b) => Number(a.current !== null) - Number(b.current !== null) || a.name.localeCompare(b.name));
    return {
      rows,
      total: rows.length,
      counts: { all: base.length, unassigned: base.filter((r) => r.current === null).length },
      facets: { clients: allClients().map((c) => ({ id: c.id, name: c.name })) },
      choices: all.map((r) => ({ id: r.id, name: r.name, placed: r.current !== null })).sort((a, b) => Number(a.placed) - Number(b.placed) || a.name.localeCompare(b.name)),
      workspaceEmpty: all.length === 0,
    };
  },

  async getStaff(staffId) {
    await gate();
    const r = staffById(staffId);
    return r ? detailOf(r) : null;
  },

  async reassign(staffId, input: ReassignInput) {
    await gate();
    await sleep(250);
    const r = staffById(staffId);
    if (!r) throw new Error("Staff member not found");
    const client = allClients().find((c) => c.id === input.clientId);
    if (!client || !client.outlets.some((o) => o.id === input.outletId)) throw new Error("Unknown client or outlet");
    if (!getRoles(true).some((x) => x.name === input.role)) throw new Error("Unknown role");
    const note = input.note.trim().slice(0, 300) || null;

    // Preview: someone else moves this person a moment before you save.
    if (urlState() === "conflict" && !conflictSpent) {
      conflictSpent = true;
      writeOtherChange(staffId, input.outletId);
      throw new ConflictError("Someone else just changed this placement");
    }
    if (input.expectedRevision !== r.revision) throw new ConflictError("Someone else just changed this placement");
    const now = currentOf(r);
    if (now && now.outletId === input.outletId && now.role === input.role) throw new Error("That is already the current placement");
    if (now && input.effectiveDate < now.start.slice(0, 10)) throw new Error("The effective date is before the current placement started");

    writePlacement(staffId, { outletId: input.outletId, role: input.role, effectiveDate: input.effectiveDate, note, actor: ME });
    return detailOf(r);
  },
};
