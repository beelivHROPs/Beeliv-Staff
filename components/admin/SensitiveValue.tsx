"use client";

/**
 * A sensitive value (NIN, bank account) shown masked. The full value is NOT in the
 * page while masked. Where the capability function allows, a "Reveal" button asks for
 * a short reason (10-200 characters, recorded), then shows the value for 30 seconds
 * with a countdown and masks it again. Every reveal is appended to the audit list
 * (lib/admin/sensitive.ts), which the Operations Activity feed shows.
 *
 * OPERATIONS (project lead 2026-10-17) sees the value DIRECTLY: no reason dialog, no
 * countdown, no re-masking. A silent audit record ("Viewed NIN details of <name>")
 * is appended to Activity (who + when, no reason, never the value).
 * HR officer / HR Manager keep masked + Reveal-with-reason: Beeliv has NOT confirmed
 * their authority yet. Both the role rule and the audit-of-view need SERVER enforcement.
 *
 * Bank details always show as three rows: Account name, Bank name, Account number.
 *
 * PROTOTYPE: the "value" is a fictional sample. Real reveal is a server call that
 * checks the grant, records the audit event and returns the value.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { Eye, LockKeyhole } from "@/components/applicant/icons";
import { useAdminIdentity } from "@/lib/admin/ops/identity";
import { canRevealSensitive, maskDisplay, REASON_MAX, REASON_MIN, recordReveal, recordView, REVEAL_SECONDS, sampleBankFor, sampleValueFor, showsSensitiveDirectly, type SensitiveSubject } from "@/lib/admin/sensitive";

const ownerOf = (record: string) => record.slice(record.indexOf(",") + 1).trim();
const isBank = (label: string) => label.toLowerCase().includes("bank");

/** Account name, Bank name, Account number: the same three rows as the Applicant profile's bank section. */
function BankRows({ owner, masked }: { owner: string; masked?: string }) {
  const b = sampleBankFor(owner, masked);
  const rows: [string, string, boolean][] = [["Account name", b.accountName, false], ["Bank name", b.bankName, false], ["Account number", b.accountNumber, true]];
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[15px]" data-testid="sensitive-open">
      {rows.map(([k, v, mono]) => (
        <span key={k} className="contents">
          <span className="text-(--ap-muted)">{k}</span>
          <span className={`break-words text-(--ap-ink) ${mono ? "font-mono tracking-wider" : "font-semibold"}`}>{v}</span>
        </span>
      ))}
    </span>
  );
}

/** Small hint under a sensitive block: Operations sees the audit wording, others see `masked` (their own wording). */
export function SensitiveNote({ children, className = "", hideForOps = false }: { children: ReactNode; className?: string; hideForOps?: boolean }) {
  const identity = useAdminIdentity();
  if (identity !== null && showsSensitiveDirectly(identity)) return hideForOps ? null : <p className={className}>Shown to you directly. Each view is recorded in Activity (that it happened, not the value).</p>;
  return <p className={className}>{children}</p>;
}

export function SensitiveValue({
  label,
  masked,
  record,
  subject,
  href,
  className = "",
}: {
  /** "NIN" or "Bank account". */
  label: string;
  /** The masked text the adapter returned (only the last digits matter). */
  masked?: string;
  /** Audit label of the record, e.g. "NIN, Hauwa Sample". */
  record: string;
  subject: SensitiveSubject;
  /** Where the record lives (shown as a link in Activity). */
  href?: string | null;
  className?: string;
}) {
  const identity = useAdminIdentity();
  const allowed = identity !== null && canRevealSensitive(identity, subject);
  // Operations: shown at once (see header). The effect only appends the silent audit record.
  const direct = identity !== null && showsSensitiveDirectly(identity);
  const owner = ownerOf(record);
  useEffect(() => {
    if (direct) recordView({ label, ownerName: owner, href });
  }, [direct, label, owner, href]);
  const [asking, setAsking] = useState(false);
  const [shown, setShown] = useState<{ value: string; until: number } | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!shown) return;
    const tick = () => {
      const s = Math.ceil((shown.until - Date.now()) / 1000);
      if (s <= 0) setShown(null);
      else setLeft(s);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [shown]);

  // Switching identity re-masks at once.
  const [seen, setSeen] = useState(identity);
  if (seen !== identity) {
    setSeen(identity);
    if (shown) setShown(null);
  }

  const reveal = (reason: string) => {
    recordReveal({ record, reason, href });
    setShown({ value: sampleValueFor(label, masked), until: Date.now() + REVEAL_SECONDS * 1000 });
    setLeft(REVEAL_SECONDS);
    setAsking(false);
  };

  if (direct) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
        {isBank(label) ? <BankRows owner={owner} masked={masked} /> : <span className="font-mono text-[15px] tracking-wider break-all text-(--ap-ink)" data-testid="sensitive-open">{sampleValueFor(label, masked)}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {shown ? (
        <>
          {isBank(label) ? <BankRows owner={owner} masked={masked} /> : <span className="font-mono text-[15px] tracking-wider break-all text-(--ap-ink)" data-testid="sensitive-open">{shown.value}</span>}
          <span role="status" className="text-[13px] text-(--ap-muted)">Hides again in {left}s</span>
          <button type="button" onClick={() => setShown(null)} className="ap-hit text-[13px] font-bold text-(--ap-violet)">Hide now</button>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 font-mono text-[15px] tracking-wider text-(--ap-muted)" aria-label={`${label}: hidden, last digits only`}>
            <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
            <span aria-hidden="true">{maskDisplay(masked)}</span>
          </span>
          {allowed ? (
            <button type="button" onClick={() => setAsking(true)} aria-haspopup="dialog" className="ap-btn ap-btn-s ap-btn-sm">
              <Eye className="size-3.5" aria-hidden="true" /> Reveal
            </button>
          ) : null}
        </>
      )}
      {asking ? <ReasonDialog label={label} record={record} onCancel={() => setAsking(false)} onConfirm={reveal} /> : null}
    </span>
  );
}

export function ReasonDialog({ label, record, onCancel, onConfirm }: { label: string; record: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const id = useId();
  const n = reason.trim().length;
  const ok = n >= REASON_MIN && n <= REASON_MAX;
  return (
    <SheetFrame
      title={`Reveal ${label}?`}
      description={`${record}. This access is recorded with your name, the reason and the time.`}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} />
          <PrimaryButton disabled={!ok} onClick={() => onConfirm(reason.trim())}>
            Reveal for {REVEAL_SECONDS} seconds
          </PrimaryButton>
        </>
      }
    >
      <label htmlFor={id} className={FIELD_LABEL}>Reason</label>
      <textarea id={id} autoFocus rows={3} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} className="ap-input mt-1.5" />
      <p className="mt-1.5 text-[13px] text-(--ap-muted)">
        Required, {REASON_MIN} to {REASON_MAX} characters ({n} so far). The value is shown for {REVEAL_SECONDS} seconds, then hidden again.
      </p>
    </SheetFrame>
  );
}
