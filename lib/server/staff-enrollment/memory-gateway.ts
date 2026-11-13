/**
 * In-memory MODEL of docs/contracts/staff-personal-details-schema.sql, used by offline tests only.
 * It mirrors the SQL contract (own-person resolution from the session, ledger replay, first-save-direct then pending change,
 * duplicate digest handling that names nobody, masks-only status, per-section checklist, append-only events). It is NOT the SQL:
 * nothing here proves locking, RLS, FK, generated-column or trigger behaviour. Never import this from runtime code.
 * Like the database it stores only what the gateway receives: ciphertext hex, a digest and a mask, never a plaintext value.
 */
import type { RpcReply, SensitiveSection, StaffEnrollmentGateway } from "./types";

export type ModelStaff = { uid: string; sessionId: string; personId: string; /** active person with the staff entitlement and a Staff record */ eligible: boolean };
type Record_ = { nonceHex: string; ciphertextHex: string; keyId: string; mask: Record<string, string>; digest: string | null; digestKeyId: string | null; revision: number; updatedAt: string };
type Change = { id: string; personId: string; section: SensitiveSection; status: "pending" | "applied" | "rejected" | "superseded"; rec: Omit<Record_, "revision" | "updatedAt"> | null; decidedBy: string | null };
type Event = { person: string; actor: string | null; section: SensitiveSection | null; action: string; detail: Record<string, string> };

const ok = (data: Record<string, unknown>): RpcReply => ({ data: { ok: true, ...data }, error: null });
const deny = (reason: string, fields?: string[]): RpcReply => ({ data: { ok: false, reason, ...(fields ? { fields } : {}) }, error: null });
const EMPTY_PERSONAL = { sex: "", relationshipStatus: "", birthday: "", nationality: "", stateOfOrigin: "", lga: "", homeAddress: "", education: "" };
const SECTIONS: SensitiveSection[] = ["next_of_kin", "nin", "bank", "accessibility"];

export type ModelOptions = { people: ModelStaff[]; failAfterWrite?: boolean; sensitiveCap?: number };

export function createMemoryStaffGateway(options: ModelOptions) {
  const state = {
    profile: new Map<string, { item: Record<string, string>; revision: number }>(),
    employment: new Map<string, { item: Record<string, string>; revision: number }>(),
    records: new Map<string, Record_>(), changes: [] as Change[], events: [] as Event[],
    ledger: new Map<string, { fp: string; result: Record<string, unknown> }>(), calls: [] as string[], sensitiveHits: new Map<string, number>(),
    failAfterWrite: !!options.failAfterWrite, n: 0,
  };
  const id = () => `cccccccc-cccc-4ccc-8ccc-${String(++state.n).padStart(12, "0")}`;
  const now = () => "2026-11-12T10:00:00.000Z";
  /** Mirrors staff_enroll_self_context: the person comes from the session, never from the request. */
  const self = (a: { actorUid: string; sessionId: string }, claimed?: string) => {
    const p = options.people.find((x) => x.uid === a.actorUid && x.sessionId === a.sessionId && x.eligible);
    return p && (claimed === undefined || claimed === p.personId) ? p : null;
  };
  const rk = (p: string, s: string) => `${p}|${s}`;
  const pending = (p: string, s: SensitiveSection) => state.changes.find((c) => c.personId === p && c.section === s && c.status === "pending");
  const sectionState = (p: string, s: SensitiveSection) => (!state.records.has(rk(p, s)) ? "empty" : pending(p, s) ? "change-pending" : "saved");
  const upd = (p: string, s: SensitiveSection) => state.records.get(rk(p, s))?.updatedAt ?? null;
  const status = (p: string) => ({
    nextOfKin: { state: sectionState(p, "next_of_kin"), maskedName: state.records.get(rk(p, "next_of_kin"))?.mask.maskedName ?? null, maskedPhone: state.records.get(rk(p, "next_of_kin"))?.mask.maskedPhone ?? null, updatedAt: upd(p, "next_of_kin") },
    nin: { state: sectionState(p, "nin"), masked: state.records.get(rk(p, "nin"))?.mask.masked ?? null, updatedAt: upd(p, "nin") },
    bank: { state: sectionState(p, "bank"), maskedAccount: state.records.get(rk(p, "bank"))?.mask.maskedAccount ?? null, updatedAt: upd(p, "bank") },
    accessibility: { state: sectionState(p, "accessibility"), updatedAt: upd(p, "accessibility") },
  });
  const personalItem = (p: string) => ({ ...(state.profile.get(p)?.item ?? EMPTY_PERSONAL) });
  const personalComplete = (p: string) => { const i = personalItem(p); return [i.sex, i.relationshipStatus, i.birthday, i.nationality, i.stateOfOrigin, i.lga, i.homeAddress].every((v) => v !== ""); };
  const checklist = (p: string) => ({
    personal: personalComplete(p), nextOfKin: state.records.has(rk(p, "next_of_kin")), nin: state.records.has(rk(p, "nin")), bank: state.records.has(rk(p, "bank")),
    education: personalItem(p).education !== "", currentEmployment: state.employment.has(rk(p, "current")), previousEmployment: state.employment.has(rk(p, "previous")),
    accessibility: state.records.has(rk(p, "accessibility")),
  });
  const employer = (p: string, slot: string) => (state.employment.has(rk(p, slot)) ? { ...state.employment.get(rk(p, slot))!.item } : null);
  const event = (person: string, actor: string | null, section: SensitiveSection | null, action: string, detail: Record<string, string> = {}) => state.events.push({ person, actor, section, action, detail });

  /** One SQL function body: ledger replay or conflict, all-or-nothing rollback. */
  function write(a: { actorUid: string; sessionId: string; requestId: string; fingerprint: string }, op: string, claimed: string | undefined, work: (p: ModelStaff) => RpcReply, replayExtra: (p: ModelStaff) => Record<string, unknown>): RpcReply {
    state.calls.push(op);
    const p = self(a, claimed); if (!p) return deny("no_access");
    const key = `${p.personId}|${op}|${a.requestId}`;
    const prior = state.ledger.get(key);
    if (prior) return prior.fp !== a.fingerprint ? deny("conflict") : ok({ replayed: true, ...prior.result, ...replayExtra(p) });
    const snap = { profile: new Map(state.profile), employment: new Map(state.employment), records: new Map(state.records), changes: state.changes.map((c) => ({ ...c })), events: [...state.events], ledger: new Map(state.ledger), n: state.n };
    try {
      const reply = work(p);
      const data = reply.data as { ok: boolean; result?: Record<string, unknown> };
      if (!data.ok) return reply; // denials happen before any write (events for duplicates are the one intended exception, written inside work)
      state.ledger.set(key, { fp: a.fingerprint, result: data.result! });
      if (state.failAfterWrite) throw new Error("boom");
      return ok({ replayed: false, ...data.result!, ...replayExtra(p) });
    } catch {
      state.profile = snap.profile; state.employment = snap.employment; state.records = snap.records; state.changes = snap.changes; state.events = snap.events; state.ledger = snap.ledger; state.n = snap.n;
      return { data: null, error: { message: "secret detail" } };
    }
  }
  const result = (r: Record<string, unknown>): RpcReply => ({ data: { ok: true, result: r }, error: null });

  const gateway: StaffEnrollmentGateway = {
    personalGet: async (a) => { state.calls.push("personalGet"); const p = self(a); return p ? ok({ item: personalItem(p.personId) }) : deny("no_access"); },
    employmentGet: async (a) => { state.calls.push("employmentGet"); const p = self(a); return p ? ok({ current: employer(p.personId, "current"), previous: employer(p.personId, "previous") }) : deny("no_access"); },
    sensitiveStatus: async (a) => { state.calls.push("sensitiveStatus"); const p = self(a); return p ? ok({ status: status(p.personId) }) : deny("no_access"); },
    checklistGet: async (a) => { state.calls.push("checklistGet"); const p = self(a); return p ? ok({ checklist: checklist(p.personId) }) : deny("no_access"); },
    personalSave: async (a) => write(a, "personal-save", undefined, (p) => {
      const prev = state.profile.get(p.personId);
      state.profile.set(p.personId, { item: { ...a.input }, revision: (prev?.revision ?? 0) + 1 });
      event(p.personId, p.personId, null, "staff_personal_details_saved");
      return result({ revision: state.profile.get(p.personId)!.revision });
    }, (p) => ({ item: personalItem(p.personId) })),
    employerSave: async (a) => write(a, "employer-save", undefined, (p) => {
      const prev = state.employment.get(rk(p.personId, a.which));
      state.employment.set(rk(p.personId, a.which), { item: { ...a.input }, revision: (prev?.revision ?? 0) + 1 });
      event(p.personId, p.personId, null, "staff_employment_saved", { which: a.which });
      return result({ revision: state.employment.get(rk(p.personId, a.which))!.revision });
    }, (p) => ({ current: employer(p.personId, "current"), previous: employer(p.personId, "previous") })),
    sensitiveSave: async (a) => {
      // Quota counts every attempt, whatever the outcome (so a duplicate cannot be told apart by running out).
      const who = self(a, a.personId);
      if (who) {
        const hits = (state.sensitiveHits.get(who.uid) ?? 0) + 1; state.sensitiveHits.set(who.uid, hits);
        if (hits > (options.sensitiveCap ?? 12)) { state.calls.push("sensitive-save"); return deny("rate_limited"); }
      }
      return write(a, "sensitive-save", a.personId, (p) => {
        const dup = a.digest && ([...state.records.entries()].some(([k, r]) => k.endsWith(`|${a.section}`) && !k.startsWith(`${p.personId}|`) && r.digest === a.digest!.hex)
          || state.changes.some((c) => c.status === "pending" && c.section === a.section && c.personId !== p.personId && c.rec?.digest === a.digest!.hex));
        if (dup) { event(p.personId, p.personId, a.section, "staff_sensitive_save_conflict", { section: a.section }); return deny("duplicate"); }
        const rec = state.records.get(rk(p.personId, a.section));
        const next = { nonceHex: a.sealed.nonceHex, ciphertextHex: a.sealed.ciphertextHex, keyId: a.sealed.keyId, mask: { ...a.mask }, digest: a.digest?.hex ?? null, digestKeyId: a.digest?.keyId ?? null };
        let outcome: string;
        if (!rec) { state.records.set(rk(p.personId, a.section), { ...next, revision: 1, updatedAt: now() }); outcome = "added"; event(p.personId, p.personId, a.section, "staff_sensitive_added", { section: a.section }); }
        else if (a.digest && rec.digest === a.digest.hex) outcome = "unchanged";
        else {
          for (const c of state.changes) if (c.personId === p.personId && c.section === a.section && c.status === "pending") { c.status = "superseded"; c.rec = null; }
          state.changes.push({ id: id(), personId: p.personId, section: a.section, status: "pending", rec: next, decidedBy: null });
          outcome = "change_requested"; event(p.personId, p.personId, a.section, "staff_sensitive_change_requested", { section: a.section });
        }
        return result({ section: a.section, outcome });
      }, (p) => ({ status: status(p.personId) }));
    },
  };

  /** Mirrors staff_enroll_change_decide for the HR side (not part of the Staff gateway): moves the proposal onto the record, purges the change. */
  function decide(changeId: string, decision: "applied" | "rejected", reviewerPersonId: string): { ok: boolean; reason?: string } {
    const c = state.changes.find((x) => x.id === changeId);
    if (!c || c.personId === reviewerPersonId) return { ok: false, reason: "not_found" };
    if (c.status !== "pending" || !c.rec) return { ok: false, reason: "stale" };
    if (decision === "applied") {
      if (c.rec.digest && [...state.records.entries()].some(([k, r]) => k.endsWith(`|${c.section}`) && !k.startsWith(`${c.personId}|`) && r.digest === c.rec!.digest)) return { ok: false, reason: "conflict" };
      const old = state.records.get(rk(c.personId, c.section))!;
      state.records.set(rk(c.personId, c.section), { ...c.rec, revision: old.revision + 1, updatedAt: "2026-11-13T09:00:00.000Z" });
    }
    c.status = decision; c.rec = null; c.decidedBy = reviewerPersonId;
    event(c.personId, reviewerPersonId, c.section, decision === "applied" ? "staff_sensitive_change_applied" : "staff_sensitive_change_rejected", { section: c.section, decision });
    return { ok: true };
  }

  return { gateway, state, decide, pendingChangeId: (p: string, s: SensitiveSection) => pending(p, s)?.id ?? null, sections: SECTIONS };
}
