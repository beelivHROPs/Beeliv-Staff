/**
 * In-memory MODEL of docs/contracts/staff-documentation-schema.sql, for offline tests only. It proves the service mapping, DTO
 * projection and the modelled rules (own record, scope, capability, separate states, immutability). It does NOT execute the SQL, so
 * locking, RLS, FK and trigger behaviour are unproven. Never import this from application code.
 */
import { STAFF_DOC_CELLS, STAFF_DOC_SLOTS, type DecideCommand, type OpenReason, type QueueQuery, type RpcReply, type SlotDef, type SlotKey, type StaffDocGateway } from "./types";

export type ModelStaff = { uid: string; sessionId: string; personId: string; name: string; reference: string; eligible: boolean };
export type ModelAdmin = { uid: string; sessionId: string; personId: string; role: "hr_officer" | "hr_manager" | "head_of_operations"; allClients: boolean; scopes: { clientId: string; outletId: string | null }[] };
export type ModelClient = { uid: string; sessionId: string; scopes: { clientId: string; outletId: string | null }[] };
export type ModelPlacement = { personId: string; clientId: string; outletId: string };
type Dec = { seq: number; decision: string; reasonCode: string | null; message: string | null; expiresOn: string | null; by: string; at: string };
type Ver = { n: number; uploadId: string; versionId: string; requestId: string; fp: string; ext: string; size: number; ct: string; intent: string; scan: string; decisions: Dec[]; at: string };
export type ModelEvent = { personId: string; slot: SlotKey; versionId: string | null; actor: string; action: string; reason: string | null };

const OK = (data: Record<string, unknown>): Promise<RpcReply> => Promise.resolve({ data: { ok: true, ...data }, error: null });
const NO = (reason: string, extra: Record<string, unknown> = {}): Promise<RpcReply> => Promise.resolve({ data: { ok: false, reason, ...extra }, error: null });
const uid = (p: string, n: number) => `${p}${p}${p}${p}${p}${p}${p}${p}-${p}${p}${p}${p}-4${p}${p}${p}-8${p}${p}${p}-${String(n).padStart(12, "0")}`;

export function createMemoryStaffDocGateway(opts: {
  staff: ModelStaff[]; admins?: ModelAdmin[]; clients?: ModelClient[]; placements?: ModelPlacement[]; enable?: SlotKey[]; now?: () => number; quota?: number;
}) {
  const now = opts.now ?? (() => Date.now());
  const defs: SlotDef[] = STAFF_DOC_SLOTS.map((d) => ({ ...d, enabled: d.enabled || !!opts.enable?.includes(d.slot) }));
  const docs = new Map<string, Ver[]>(); // `${person}|${slot}`
  const events: ModelEvent[] = [];
  const ledger = new Map<string, { fp: string; result: Record<string, unknown> }>();
  const intents = new Map<string, { person: string; slot: SlotKey; ver: Ver }>();
  let counter = 100, calls = 0;
  const quotaLeft = new Map<string, number>();
  const cap = (id: string) => { const left = (quotaLeft.get(id) ?? opts.quota ?? 1e9) - 1; quotaLeft.set(id, left); return left >= 0; };
  const iso = (t: number) => new Date(t).toISOString();
  const day = () => iso(now()).slice(0, 10);
  const placements = opts.placements ?? [];

  const person = (p: string) => opts.staff.find((s) => s.personId === p);
  const own = (a: { actorUid: string; sessionId: string }) => opts.staff.find((s) => s.uid === a.actorUid && s.sessionId === a.sessionId && s.eligible);
  const adm = (a: { actorUid: string; sessionId: string }) => (opts.admins ?? []).find((s) => s.uid === a.actorUid && s.sessionId === a.sessionId);
  const cli = (a: { actorUid: string; sessionId: string }) => (opts.clients ?? []).find((s) => s.uid === a.actorUid && s.sessionId === a.sessionId);
  const inScope = (scopes: { clientId: string; outletId: string | null }[], pl: ModelPlacement) => scopes.some((s) => s.clientId === pl.clientId && (s.outletId === null || s.outletId === pl.outletId));
  const visibleToAdmin = (a: ModelAdmin, p: string) => (a.allClients && a.role !== "hr_officer") || placements.some((pl) => pl.personId === p && inScope(a.scopes, pl));
  const visibleToClient = (c: ModelClient, p: string) => placements.some((pl) => pl.personId === p && inScope(c.scopes, pl));
  const has = (a: ModelAdmin, cell: string) => cell === "org.staff.read" || a.role !== "hr_officer";
  const cellFor = (def: SlotDef, action: "queue" | "open" | "decide") => STAFF_DOC_CELLS[def.sensitivity][action];
  const defOf = (slot: string) => defs.find((d) => d.slot === slot && d.enabled);
  const versions = (p: string, slot: string) => docs.get(`${p}|${slot}`) ?? [];
  const current = (vs: Ver[]) => [...vs].reverse().find((v) => v.scan === "clean");
  const latestDec = (v: Ver) => v.decisions[v.decisions.length - 1];

  /** Mirror of staff_doc_slot_facts. */
  function facts(p: string, def: SlotDef, view: "own" | "hr" | "client") {
    const vs = versions(p, def.slot), cur = current(vs), newest = vs[vs.length - 1];
    const dec = cur ? latestDec(cur) : undefined;
    const review = !dec ? "not-reviewed" : dec.decision === "verified" ? "verified" : dec.decision === "update_required" ? "update-required" : "rejected";
    const expired = review === "verified" && !!dec?.expiresOn && dec.expiresOn < day();
    let incoming: string | null = null;
    if (newest && (!cur || newest.n > cur.n)) {
      incoming = newest.scan === "rejected" || newest.intent === "rejected" ? "refused" : newest.scan === "error" ? "unavailable"
        : newest.scan === "queued" || newest.intent === "checking" ? "checking" : newest.intent === "reserved" ? "awaiting-bytes" : null;
    }
    const state = incoming === "checking" ? "checking" : !cur ? "requested" : expired ? "expired" : review === "verified" ? "verified" : review === "update-required" ? "update-required" : review === "rejected" ? "rejected" : "available";
    if (view === "client") return { slot: def.slot, label: def.label, status: ({ requested: "missing", checking: "in-review", available: "in-review", verified: "verified" } as Record<string, string>)[state] ?? "needs-attention" };
    const showReason = review === "update-required" || review === "rejected";
    const currentJson = cur ? {
      version: cur.n, review, reviewedAt: dec ? dec.at : null, reasonCode: showReason ? dec!.reasonCode : null, message: showReason ? dec!.message : null,
      expiresOn: review === "verified" ? dec!.expiresOn : null, uploadedAt: cur.at, ...(view === "hr" ? { versionId: cur.versionId, decisionSeq: dec ? dec.seq : 0 } : {}),
    } : null;
    return { slot: def.slot, label: def.label, sensitive: def.sensitivity === "sensitive", counts: def.counts, state, current: currentJson, incoming: incoming ? { uploadId: newest.uploadId, status: incoming } : null };
  }
  const summary = (items: { counts: boolean; state: string }[]) => {
    const counted = items.filter((i) => i.counts).length, verified = items.filter((i) => i.counts && i.state === "verified").length;
    return { counted, verified, complete: counted > 0 && verified === counted };
  };

  const gateway: StaffDocGateway = {
    checklist: async (a) => {
      calls++; const s = own(a); if (!s) return NO("no_access");
      const items = defs.filter((d) => d.enabled).map((d) => facts(s.personId, d, "own"));
      return OK({ items, summary: summary(items as { counts: boolean; state: string }[]) });
    },
    requestSlot: async (a) => {
      calls++; const s = own(a); if (!s) return NO("no_access");
      const def = defOf(a.slot); const ext = a.fileName.slice(a.fileName.lastIndexOf(".")).toLowerCase();
      if (!def || a.size < 1 || a.size > 5_000_000 || !def.types.some((t) => t.extension === ext && t.mime === a.contentType)) return NO("invalid_request");
      if (!cap(a.actorUid)) return NO("rate_limited");
      const vs = versions(s.personId, a.slot);
      const prior = vs.find((v) => v.requestId === a.requestId);
      const envelope = (v: Ver, replayed: boolean) => ({ ownerId: s.personId, requestId: v.requestId, uploadId: v.uploadId, fingerprint: v.fp, purpose: a.slot, size: v.size, contentType: v.ct,
        state: "reserved", bucket: "staff-document-quarantine", objectKey: `${v.uploadId}/source${v.ext}`, completeBefore: iso(now() + 600_000), replayed });
      if (prior) return prior.fp !== a.fingerprint ? NO("conflict") : prior.intent !== "reserved" ? NO("conflict") : OK(envelope(prior, true));
      if (facts(s.personId, def, "own").incoming?.status === "checking") return NO("conflict");
      counter++;
      const v: Ver = { n: vs.length + 1, uploadId: uid("b", counter), versionId: uid("c", counter), requestId: a.requestId, fp: a.fingerprint, ext, size: a.size, ct: a.contentType, intent: "reserved", scan: "none", decisions: [], at: iso(now()) };
      docs.set(`${s.personId}|${a.slot}`, [...vs, v]); intents.set(v.uploadId, { person: s.personId, slot: a.slot, ver: v });
      events.push({ personId: s.personId, slot: a.slot, versionId: null, actor: s.personId, action: "upload_requested", reason: null });
      return OK(envelope(v, false));
    },
    complete: async (a) => {
      calls++; const s = own(a); if (!s) return NO("no_access");
      if (!cap(a.actorUid)) return NO("rate_limited");
      const it = intents.get(a.uploadId); if (!it || it.person !== s.personId) return NO("no_access");
      if (it.ver.intent === "checking" || it.ver.intent === "completed") return OK({ ownerId: s.personId, requestId: a.requestId, uploadId: a.uploadId, status: "checking", replayed: true });
      if (it.ver.intent !== "reserved") return NO("conflict");
      it.ver.intent = "checking"; it.ver.scan = "queued";
      events.push({ personId: s.personId, slot: it.slot, versionId: null, actor: s.personId, action: "upload_queued", reason: null });
      return OK({ ownerId: s.personId, requestId: a.requestId, uploadId: a.uploadId, status: "checking", replayed: false });
    },
    uploadStatus: async (a) => {
      calls++; const s = own(a); if (!s) return NO("no_access");
      const it = intents.get(a.uploadId); if (!it || it.person !== s.personId) return NO("no_access");
      const v = it.ver; const cur = current(versions(it.person, it.slot));
      const status = v.intent === "reserved" ? "awaiting-bytes" : v.intent === "rejected" || v.scan === "rejected" ? "rejected" : v.scan === "error" ? "unavailable"
        : v.intent === "completed" && v.scan === "clean" && cur?.versionId === v.versionId ? "available" : "checking";
      return OK({ uploadId: a.uploadId, status });
    },
    hrQueue: async (a) => {
      calls++; const ad = adm(a); if (!ad) return NO("no_access");
      const q: QueueQuery = a.query; const rows: Record<string, unknown>[] = [];
      for (const s of [...opts.staff].sort((x, y) => x.name.localeCompare(y.name))) {
        if (!visibleToAdmin(ad, s.personId)) continue;
        const pl = placements.find((x) => x.personId === s.personId);
        if (q.clientId && pl?.clientId !== q.clientId) continue;
        if (q.search && !`${s.name} ${s.reference}`.toLowerCase().includes(q.search.toLowerCase())) continue;
        for (const d of defs.filter((x) => x.enabled && (!q.slot || x.slot === q.slot))) {
          const f = facts(s.personId, d, "hr") as Record<string, unknown>;
          if (q.state && f.state !== q.state) continue;
          rows.push({ personId: s.personId, name: s.name, reference: s.reference, ...f,
            canOpen: has(ad, cellFor(d, "open")) && f.current !== null, canDecide: has(ad, cellFor(d, "decide")) && f.current !== null });
        }
      }
      return OK({ items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: rows.length, page: q.page, pageSize: q.pageSize });
    },
    hrOpen: async (a: { actorUid: string; sessionId: string; versionId: string; reason: OpenReason }) => {
      calls++; const ad = adm(a); if (!ad) return NO("no_access");
      if (!cap(a.actorUid)) return NO("rate_limited");
      for (const [key, vs] of docs) {
        const v = vs.find((x) => x.versionId === a.versionId); if (!v) continue;
        const [p, slot] = key.split("|"); const def = defOf(slot);
        if (!def || !visibleToAdmin(ad, p)) return NO("not_found");
        if (!has(ad, cellFor(def, "open"))) return NO("no_access");
        if (current(vs)?.versionId !== v.versionId || v.scan !== "clean") return NO("not_found");
        events.push({ personId: p, slot: slot as SlotKey, versionId: v.versionId, actor: ad.personId, action: "open_granted", reason: a.reason });
        return OK({ versionId: v.versionId, slot, bucket: "staff-document-clean", objectKey: `${v.versionId}/source${v.ext}`, mediaType: v.ct, sizeBytes: v.size });
      }
      return NO("not_found");
    },
    hrDecide: async (a: { actorUid: string; sessionId: string; requestId: string; fingerprint: string; command: DecideCommand }) => {
      calls++; const ad = adm(a); if (!ad) return NO("no_access");
      if (!cap(a.actorUid)) return NO("rate_limited");
      const lk = `${ad.personId}|${a.requestId}`, prior = ledger.get(lk);
      if (prior) return prior.fp !== a.fingerprint ? NO("conflict") : OK({ replayed: true, ...prior.result });
      const c = a.command;
      for (const [key, vs] of docs) {
        const v = vs.find((x) => x.versionId === c.versionId); if (!v) continue;
        const [p, slot] = key.split("|"); const def = defOf(slot);
        if (!def || !visibleToAdmin(ad, p)) return NO("not_found");
        if (!has(ad, cellFor(def, "decide"))) return NO("no_access");
        if (c.expiresOn && (!def.canExpire || c.expiresOn <= day())) return NO("invalid_request");
        if (current(vs)?.versionId !== v.versionId || v.scan !== "clean") return NO("stale");
        if (v.decisions.length !== c.expectedSeq) return NO("stale");
        if (!events.some((e) => e.versionId === v.versionId && e.actor === ad.personId && e.action === "open_granted")) return NO("no_access");
        v.decisions.push({ seq: v.decisions.length + 1, decision: c.decision, reasonCode: c.reasonCode, message: c.message, expiresOn: c.expiresOn, by: ad.personId, at: iso(now()) });
        events.push({ personId: p, slot: slot as SlotKey, versionId: v.versionId, actor: ad.personId, action: "decided", reason: c.reasonCode });
        const result = { versionId: v.versionId, decision: c.decision, decisionSeq: v.decisions.length };
        ledger.set(lk, { fp: a.fingerprint, result });
        return OK({ replayed: false, ...result });
      }
      return NO("not_found");
    },
    completion: async (a) => {
      calls++;
      const isClient = a.audience === "client";
      const ad = isClient ? undefined : adm(a), cl = isClient ? cli(a) : undefined;
      if (!ad && !cl) return NO("no_access");
      const people: Record<string, unknown>[] = [];
      for (const pid of [...new Set(a.personIds)].sort()) {
        if (!person(pid) || (ad && !visibleToAdmin(ad, pid)) || (cl && !visibleToClient(cl, pid))) continue;
        const list = defs.filter((d) => d.enabled && (!cl || d.sensitivity === "ordinary"));
        const items = list.map((d) => facts(pid, d, cl ? "client" : "hr") as Record<string, unknown>);
        if (cl) people.push({ personId: pid, items, complete: items.length > 0 && items.every((i) => i.status === "verified") });
        else people.push({ personId: pid, items, summary: summary(items as unknown as { counts: boolean; state: string }[]) });
      }
      return OK({ people });
    },
  };

  return {
    gateway, events, defs,
    callCount: () => calls,
    /** Scanner hook (Codex-owned in reality): finish a queued scan. Only a scan can make a version clean. */
    scan(uploadId: string, result: "clean" | "rejected" | "error") {
      const it = intents.get(uploadId); if (!it) throw new Error("unknown upload");
      it.ver.scan = result;
      it.ver.intent = result === "rejected" ? "rejected" : "completed";
    },
    ver(uploadId: string) { return intents.get(uploadId)?.ver; },
  };
}
