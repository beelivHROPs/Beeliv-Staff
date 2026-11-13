"use client";

/**
 * DEMO ONLY (lib/demo-files/store.ts): shows a real file the person added in the
 * Applicant app, inside Admin. Reveal rules follow lib/admin/sensitive.ts:
 *  - Operations and the HR Manager open sensitive files directly; a silent audit
 *    event (who + when, never the file) is written.
 *  - The HR officer sees a masked placeholder and must Reveal with a reason first
 *    (staff in scope only; never applicants). The file hides again after 30 seconds.
 *  - Non-sensitive files open for any Admin role.
 * Hiding a control is presentation only; the server re-checks and writes the audit.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ReasonDialog } from "@/components/admin/SensitiveValue";
import { Eye, LockKeyhole } from "@/components/applicant/icons";
import { DocumentPreviewDialog, DocumentPreviewPanel } from "@/components/shared/documents/DocumentPreview";
import { toast } from "@/components/ui/toast";
import { useDemoFileMeta } from "@/lib/demo-files/hooks";
import { useAdminIdentity } from "@/lib/admin/ops/identity";
import { canRevealSensitive, recordReveal, recordView, REVEAL_SECONDS, showsSensitiveDirectly, type SensitiveSubject } from "@/lib/admin/sensitive";

interface Access {
  /** Display name of the document's owner, used in the audit record. */
  ownerName: string;
  /** Present when the file is sensitive (ID images, banking): "NIN" or "Bank account". */
  sensitiveLabel?: string;
  subject: SensitiveSubject;
  href?: string | null;
}

/** Who may open this file right now, and the reveal-with-reason flow for the HR officer. */
function useFileAccess({ ownerName, sensitiveLabel, subject, href }: Access) {
  const identity = useAdminIdentity();
  const sensitive = !!sensitiveLabel;
  const direct = identity !== null && showsSensitiveDirectly(identity);
  const canAsk = identity !== null && canRevealSensitive(identity, subject);
  const [until, setUntil] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const s = Math.ceil((until - Date.now()) / 1000);
      if (s <= 0) setUntil(null);
      else setLeft(s);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [until]);

  // Switching identity masks again at once.
  const [seen, setSeen] = useState(identity);
  if (seen !== identity) {
    setSeen(identity);
    if (until !== null) setUntil(null);
  }

  return {
    ready: identity !== null,
    sensitive,
    direct,
    canAsk,
    asking,
    left,
    /** True when the file may be shown now. */
    open: !sensitive || direct || until !== null,
    /** Silent audit for a direct view. Call when the file is actually shown. */
    audit: () => {
      if (sensitive && direct) recordView({ label: sensitiveLabel as string, ownerName, href });
    },
    ask: () => setAsking(true),
    cancel: () => setAsking(false),
    confirm: (reason: string) => {
      recordReveal({ record: `${sensitiveLabel}, ${ownerName}`, reason, href });
      setUntil(Date.now() + REVEAL_SECONDS * 1000);
      setLeft(REVEAL_SECONDS);
      setAsking(false);
    },
    hide: () => setUntil(null),
  };
}

function Placeholder({ canAsk, onAsk }: { canAsk: boolean; onAsk: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--ap-line) bg-(--ap-tint-soft) p-6 text-center min-[768px]:min-h-[380px]">
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-(--ap-violet)">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-(--ap-ink)">This file is hidden</p>
      <p className="max-w-[44ch] text-[13px] text-(--ap-muted)">{canAsk ? "Opening it needs a reason and is recorded." : "It is not available to your role."}</p>
      {canAsk ? (
        <button type="button" onClick={onAsk} aria-haspopup="dialog" className="ap-btn ap-btn-p ap-btn-sm">
          <Eye className="size-4" aria-hidden="true" /> Reveal with a reason
        </button>
      ) : null}
    </div>
  );
}

/** The inline preview on the document page. Renders `fallback` when no demo file exists for it. */
export function AdminFilePreview({ fileKey, fallback, ...access }: Access & { fileKey: string | null; fallback: ReactNode }) {
  const meta = useDemoFileMeta(fileKey);
  const a = useFileAccess(access);
  const shown = !!meta && a.ready && a.open;
  const audit = a.audit;
  useEffect(() => {
    if (shown && a.direct) audit();
    // The audit helper dedupes per person and minute; re-run only when the file opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, a.direct]);

  if (!fileKey || !meta) return <>{fallback}</>;
  if (!a.ready) return <div className="ap-shimmer h-[280px] rounded-2xl min-[768px]:h-[380px]" role="status" aria-label="Loading" />;
  return (
    <>
      {a.open ? (
        <>
          {a.sensitive && !a.direct ? (
            <p role="status" className="mb-2 flex flex-wrap items-center gap-x-3 text-[13px] text-(--ap-muted)">
              Hides again in {a.left}s
              <button type="button" onClick={a.hide} className="ap-hit font-bold text-(--ap-violet)">
                Hide now
              </button>
            </p>
          ) : null}
          <DocumentPreviewPanel fileKey={fileKey} />
        </>
      ) : (
        <Placeholder canAsk={a.canAsk} onAsk={a.ask} />
      )}
      {a.asking ? <ReasonDialog label={a.sensitive ? (access.sensitiveLabel as string) : "File"} record={`${access.sensitiveLabel}, ${access.ownerName}`} onCancel={a.cancel} onConfirm={a.confirm} /> : null}
    </>
  );
}

/** A "View" button for a list row (Applicant 360 documents); opens the preview dialog after the reveal rules are met. */
export function AdminFileViewButton({ fileKey, title, ...access }: Access & { fileKey: string | null; title: string }) {
  const meta = useDemoFileMeta(fileKey);
  const a = useFileAccess(access);
  const [dialog, setDialog] = useState(false);
  // A revealed sensitive file closes again when its 30 seconds end (a.open turns false).
  const showDialog = dialog && a.open;

  if (!fileKey || !meta) return null;

  function onView() {
    if (!a.ready) return;
    if (a.open) {
      a.audit();
      setDialog(true);
    } else if (a.canAsk) {
      a.ask();
    } else {
      toast.add({ title: "This file is not available to your role" });
    }
  }

  return (
    <>
      <button type="button" onClick={onView} aria-label={`View ${title}`} className="ap-btn ap-btn-s ap-btn-sm">
        {a.sensitive && !a.open ? <LockKeyhole className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        View
      </button>
      {showDialog ? <DocumentPreviewDialog fileKey={fileKey} title={title} onClose={() => { setDialog(false); a.hide(); }} /> : null}
      {a.asking ? <ReasonDialog label={access.sensitiveLabel ?? "File"} record={`${access.sensitiveLabel}, ${access.ownerName}`} onCancel={a.cancel} onConfirm={(reason) => { a.confirm(reason); setDialog(true); }} /> : null}
    </>
  );
}
