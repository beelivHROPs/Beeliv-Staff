"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HrQueueDto, HrQueueRowDto, OpenGrant, Decision, ReasonCode } from "@/lib/server/staff-documentation/types";
import { PageHeading } from "@/components/applicant/primitives";

async function call<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/admin/staff-documentation/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(30000),
  });
  const reply = await response.json();
  if (!response.ok || reply?.ok !== true || !reply.value) throw new Error("unavailable");
  return reply.value as T;
}
const words: Record<string, string> = {
  requested: "Awaiting upload", checking: "Checking file", available: "Ready for review", verified: "Verified",
  "update-required": "Update requested", rejected: "File refused", expired: "Expired",
};
const reasons: { value: ReasonCode; label: string }[] = [
  { value: "unreadable", label: "Cannot read the document" }, { value: "wrong_document", label: "Wrong document" },
  { value: "expired", label: "Expired document" }, { value: "incomplete", label: "Incomplete document" },
  { value: "mismatch", label: "Details do not match" }, { value: "other", label: "Other" },
];

export function LiveStaffDocumentsView() {
  const [data, setData] = useState<HrQueueDto | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<HrQueueRowDto | null>(null);
  const [decision, setDecision] = useState<Decision>("verified");
  const [reason, setReason] = useState<ReasonCode | "">("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [grant, setGrant] = useState<OpenGrant | null>(null);
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = useCallback(async () => {
    const version = ++sequence.current;
    setLoading(true); setError(""); setData(null); setSelected(null); setGrant(null);
    try {
      const next = await call<HrQueueDto>("hr-queue", { page, pageSize: 20, state: filter });
      if (!Array.isArray(next.items) || !Number.isSafeInteger(next.total)) throw new Error("invalid_reply");
      if (mounted.current && sequence.current === version) setData(next);
    } catch {
      if (mounted.current && sequence.current === version) setError("We couldn't load staff documents. Check your connection and access, then try again.");
    } finally { if (mounted.current && sequence.current === version) setLoading(false); }
  }, [page, filter]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  function choose(row: HrQueueRowDto) {
    setSelected(row); setGrant(null); setDecision("verified"); setReason(""); setMessage(""); setNotice("");
  }
  async function open() {
    if (!selected?.current || !selected.canOpen || busy) return;
    const target = selected.current.versionId;
    setBusy(true); setNotice(""); setGrant(null);
    try {
      const next = await call<OpenGrant>("hr-open", { versionId: target, reason: "verify" });
      const url = new URL(next.url);
      if (url.origin !== "https://lrkeihyqeuuxscmjxtqn.supabase.co" || url.username || url.password || url.hash ||
          !["pdf", "jpg", "jpeg", "png"].some(ext => url.pathname === `/storage/v1/object/sign/staff-document-clean/${target}/source.${ext}`) ||
          !url.searchParams.get("token") || [...url.searchParams.keys()].some(key => key !== "token") ||
          !Number.isFinite(Date.parse(next.expiresAt)) || Date.parse(next.expiresAt) <= Date.now() || Date.parse(next.expiresAt) > Date.now() + 125000) throw new Error("invalid_reply");
      if (mounted.current) setGrant(next);
    } catch { if (mounted.current) setNotice("We couldn't open this file. Refresh the list before trying again."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected?.current || !selected.canDecide || busy || (decision !== "verified" && (!reason || message.trim().length < 3))) return;
    setBusy(true); setNotice("");
    try {
      await call("hr-decide", { requestId: crypto.randomUUID(), versionId: selected.current.versionId,
        expectedSeq: selected.current.decisionSeq, decision,
        reasonCode: decision === "verified" ? null : reason, message: decision === "verified" ? null : message.trim() });
      if (mounted.current) { setNotice("Review saved."); await load(); }
    } catch {
      if (mounted.current) { await load(); setNotice("We couldn't confirm the review. Check the refreshed status before submitting again."); }
    } finally { if (mounted.current) setBusy(false); }
  }
  return <div className="space-y-5">
    <PageHeading title="Staff documents" />
    <p className="text-sm text-(--ap-muted)">Review uploaded documents and track what each staff member still needs to provide.</p>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-semibold">Status <select className="ap-input ml-2" value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setPage(1); }}>
        <option value="">All</option>{Object.entries(words).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={loading || busy} onClick={() => void load()}>Refresh</button>
    </div>
    {notice ? <p role="status" className="rounded-xl bg-(--ap-tint-soft) p-3 text-sm">{notice}</p> : null}
    {loading ? <p role="status">Loading documents…</p> : error ? <p role="alert">{error}</p> : data?.items.length === 0 ? <div className="ap-card rounded-2xl p-6">No staff documents match this view.</div> :
      <ul className="divide-y divide-(--ap-line-2) rounded-2xl border border-(--ap-line-2)">
        {data?.items.map(row => <li key={`${row.personId}:${row.slot}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><b className="block">{row.name}</b><span className="text-sm text-(--ap-muted)">{row.reference} · {row.label}</span><p className="text-sm">{words[row.state] ?? "Unavailable"}</p></div>
          {row.current && (row.canOpen || row.canDecide) ? <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={busy} onClick={() => choose(row)}>Review document</button> : null}
        </li>)}
      </ul>}
    {data && data.total > 20 ? <nav aria-label="Document pages" className="flex items-center gap-4">
      <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={page <= 1 || busy || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
      <span>Page {page}</span><button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={page * 20 >= data.total || busy || loading} onClick={() => setPage(p => p + 1)}>Next</button>
    </nav> : null}
    {selected?.current ? <section aria-labelledby="staff-document-review" className="ap-card space-y-4 rounded-2xl p-5">
      <h2 id="staff-document-review" className="text-lg font-bold">{selected.name}: {selected.label}</h2>
      <p className="text-sm">Version {selected.current.version}. Checking a file for malware does not verify its contents.</p>
      {selected.canOpen ? <div className="flex flex-wrap gap-3">
        <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={busy} onClick={() => void open()}>Prepare file for viewing</button>
        {grant ? <a className="ap-btn ap-btn-s ap-btn-sm" href={grant.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open file (link expires shortly)</a> : null}
      </div> : null}
      {selected.canDecide ? <form onSubmit={save} className="space-y-3">
        <label className="block text-sm font-semibold">Review decision<select className="ap-input mt-1 block w-full" value={decision} disabled={busy} onChange={e => setDecision(e.target.value as Decision)}>
          <option value="verified">Verify document</option><option value="update_required">Request an update</option><option value="rejected">Reject document</option>
        </select></label>
        {decision !== "verified" ? <>
          <label className="block text-sm font-semibold">Reason<select required className="ap-input mt-1 block w-full" value={reason} disabled={busy} onChange={e => setReason(e.target.value as ReasonCode)}>
            <option value="">Choose a reason</option>{reasons.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select></label>
          <label className="block text-sm font-semibold">Message to the staff member<textarea className="ap-input mt-1 block w-full" required minLength={3} maxLength={300} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} /></label>
        </> : null}
        <button className="ap-btn ap-btn-p" type="submit" disabled={busy}>Save review</button>
      </form> : null}
      <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={busy} onClick={() => { setSelected(null); setGrant(null); }}>Close review</button>
    </section> : null}
  </div>;
}
