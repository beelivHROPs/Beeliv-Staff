/**
 * DEV FIXTURE for Operations "Clients & HR". FICTIONAL ("Sample" people, "Demo"
 * clients). Clients, open vacancies and waiting requests are read from the
 * Business-at-a-glance fixture (scope "all") through its SERVICE; the first
 * answer seeds this store, after which assignments live here. So the HR and
 * Operations clients lists can disagree after you assign: the other mocks are
 * not written to (the real backend is one source). Rules here are PROVISIONAL
 * mock behaviour (one primary HR per client, any HR officer may be chosen, note
 * optional, a stale revision is refused); the backend owns them
 * (docs/contracts/ops-assignments.md, needs Beeliv confirmation). Nothing is
 * emailed. Replace with a Supabase adapter implementing OpsAssignmentsAdapter.
 *
 * Previews: ?state=restricted (403), ?state=conflict (the first assignment you
 * save is refused because someone else changed that client first), the shell's
 * "Prototype state" control (loading / empty / error).
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getGlance } from "../glance/service";
import { ConflictError } from "./adapter";
import type { OpsAssignmentsAdapter } from "./assignments-adapter";
import type { AssignInput, AssignmentDetail, AssignmentHistoryEntry, AssignmentRow, AssignmentsPage, AssignmentsQuery, ClientChoice, HrLoad, HrOfficer } from "./assignments-types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(notify);

const ME = "Adaeze Sample (Head of Operations)";
const COLLEAGUE = "Tobi Sample (Operations)";
const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));

/** Same ids as the Staff / Clients fixtures for the first two officers. */
export const HR_OFFICERS: HrOfficer[] = [
  { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a003", name: "Ngozi Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a004", name: "Ibrahim Sample" },
];

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

/* ---------- store ---------- */

interface Rec {
  row: AssignmentRow;
  history: AssignmentHistoryEntry[];
}
let store: Map<string, Rec> | null = null;
let seeding: Promise<Map<string, Rec>> | null = null;
let seq = 0;
let conflictSpent = false;

const hrByName = (name: string | null) => HR_OFFICERS.find((h) => h.name === name) ?? null;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** Build the store once from the glance fixture (all clients, Operations scope). */
async function seed(): Promise<Map<string, Rec>> {
  if (store) return store;
  seeding ??= getGlance("all").then((g) => {
    const m = new Map<string, Rec>();
    g.byClient.forEach((c, i) => {
      const hr = hrByName(c.hr);
      m.set(c.id, {
        row: { id: c.id, reference: `BLV-CLI-PLACEHOLDER-${i + 1}`, name: c.name, statusLabel: c.statusLabel, statusTone: c.statusTone, hr, assignedAt: hr ? daysAgo(12 + i * 9) : null, openVacancies: c.openJobs, pendingItems: c.requestsWaiting, revision: 1 },
        history: hr ? [{ id: `ah-seed-${i}`, at: daysAgo(12 + i * 9), actor: COLLEAGUE, kind: "assigned", fromHr: null, toHr: hr.name, note: null }] : [],
      });
    });
    store = m;
    return m;
  });
  try {
    return await seeding;
  } catch (e) {
    seeding = null; // let the next call try again
    throw e;
  }
}

/** Reports fixture: which HR currently holds each client (so a reassignment shows in the HR workload report). */
export async function currentHrByClient(): Promise<Map<string, HrOfficer | null>> {
  const s = await seed();
  return new Map([...s.values()].map((r) => [r.row.id, r.row.hr]));
}

const loadFor = (s: Map<string, Rec>): HrLoad[] =>
  HR_OFFICERS.map((hr) => {
    const mine = [...s.values()].filter((r) => r.row.hr?.id === hr.id);
    return { hr, clients: mine.length, openVacancies: mine.reduce((n, r) => n + r.row.openVacancies, 0), pendingItems: mine.reduce((n, r) => n + r.row.pendingItems, 0) };
  });

const detailOf = (s: Map<string, Rec>, r: Rec): AssignmentDetail => ({ ...r.row, history: r.history, hrOptions: loadFor(s) });

/* ---------- adapter ---------- */

export const mockOpsAssignmentsAdapter: OpsAssignmentsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listAssignments(q: AssignmentsQuery): Promise<AssignmentsPage> {
    const mode = await gate();
    const s = await seed();
    const all = mode === "empty" ? [] : [...s.values()].map((r) => r.row);
    const needle = q.search.trim().toLowerCase();
    const matches = (r: AssignmentRow) => (!needle || r.name.toLowerCase().includes(needle) || (r.hr?.name.toLowerCase().includes(needle) ?? false)) && (!q.hrId || r.hr?.id === q.hrId);
    const base = all.filter(matches);
    const rows = base.filter((r) => q.show === "all" || r.hr === null).sort((a, b) => Number(a.hr !== null) - Number(b.hr !== null) || a.name.localeCompare(b.name));
    const choices: ClientChoice[] = all.map((r) => ({ id: r.id, name: r.name, hr: r.hr, revision: r.revision })).sort((a, b) => Number(a.hr !== null) - Number(b.hr !== null) || a.name.localeCompare(b.name));
    return {
      rows,
      total: rows.length,
      counts: { all: base.length, unassigned: base.filter((r) => r.hr === null).length },
      load: mode === "empty" ? [] : loadFor(s),
      facets: { hr: HR_OFFICERS },
      choices,
      workspaceEmpty: all.length === 0,
    };
  },

  async getAssignment(clientId) {
    await gate();
    const s = await seed();
    const r = s.get(clientId);
    return r ? detailOf(s, r) : null;
  },

  async assignHr(clientId: string, input: AssignInput) {
    await gate();
    await sleep(250);
    const s = await seed();
    const r = s.get(clientId);
    if (!r) throw new Error("Client not found");
    const chosen = HR_OFFICERS.find((h) => h.id === input.hrId);
    if (!chosen) throw new Error("Unknown HR officer");
    const note = input.note.trim().slice(0, 300) || null;

    // Preview: someone else assigns this client a moment before you save.
    if (urlState() === "conflict" && !conflictSpent) {
      conflictSpent = true;
      const other = HR_OFFICERS.find((h) => h.id !== r.row.hr?.id && h.id !== chosen.id) ?? HR_OFFICERS[0];
      r.history = [{ id: `ah-${++seq}`, at: new Date().toISOString(), actor: COLLEAGUE, kind: r.row.hr ? "reassigned" : "assigned", fromHr: r.row.hr?.name ?? null, toHr: other.name, note: null }, ...r.history];
      r.row = { ...r.row, hr: other, assignedAt: new Date().toISOString(), revision: r.row.revision + 1 };
      notify();
      throw new ConflictError("Someone else just changed this client");
    }
    if (input.expectedRevision !== r.row.revision) throw new ConflictError("Someone else just changed this client");
    if (r.row.hr?.id === chosen.id) throw new Error("That officer is already assigned");

    const at = new Date().toISOString();
    r.history = [{ id: `ah-${++seq}`, at, actor: ME, kind: r.row.hr ? "reassigned" : "assigned", fromHr: r.row.hr?.name ?? null, toHr: chosen.name, note }, ...r.history];
    r.row = { ...r.row, hr: chosen, assignedAt: at, revision: r.row.revision + 1 };
    notify();
    return detailOf(s, r);
  },
};
