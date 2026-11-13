"use client";

/**
 * "Needs a home": inbound emails that could not be matched to a case. Shown
 * only to Operations or the delegated triage owner (capability inbox.triage;
 * the server re-checks). Contract: docs/contracts/inbox-email.md section 7.
 * Everything here is SAMPLE data until the inbound-mail backend exists.
 */
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleAlert, Mail } from "@/components/applicant/icons";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { ClientPageError } from "@/components/client/states";
import { EmptyState } from "@/components/applicant/primitives";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { inboxActions, type InboxLoadable } from "@/lib/admin/inbox/hooks";
import type { CasePickerItem, NeedsHomeItem } from "@/lib/admin/inbox/types";
import { NEEDS_HOME_REASON, listStamp } from "./meta";

/** Case picker. Phones: bottom sheet. Wider: centred card. z-[150] so it sits above every other layer. */
function CasePickerSheet({ item, onClose }: { item: NeedsHomeItem; onClose: () => void }) {
  const isClient = useIsClient();
  const titleId = useId();
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CasePickerItem[] | null>(null);
  const [pick, setPick] = useState<CasePickerItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    inboxActions.searchCasesForPicker(q).then(
      (r) => !off && setResults(r),
      () => !off && setResults([]),
    );
    return () => {
      off = true;
    };
  }, [q]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function assign() {
    if (!pick || busy) return;
    setBusy(true);
    try {
      await inboxActions.assignNeedsHome(item.id, pick.id);
      toast.add({ title: "Added to the case", description: `${pick.reference} now shows this email.`, type: "success" });
      onClose();
    } catch {
      toast.add({ title: "Could not add the email", description: "Nothing changed. Please try again.", type: "error" });
      setBusy(false);
    }
  }

  const differs = pick?.senderEmail && pick.senderEmail.toLowerCase() !== item.fromEmail.toLowerCase();

  if (!isClient) return null;
  return createPortal(
    <div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[150] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-(--ap-surface) outline-none min-[768px]:w-[520px] min-[768px]:rounded-[22px]">
        <div className="px-5 pt-5 min-[768px]:px-7 min-[768px]:pt-7">
          <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
            Assign to a case
          </h2>
          <p className="mt-2 text-[14px] leading-snug text-(--ap-muted)">
            The email from {item.fromName ?? item.fromEmail} is added to the case you choose as a message from them. Nothing is sent to anyone.
          </p>
          <SearchBar className="mt-3" search={{ value: q, onChange: setQ, label: "Search cases", placeholder: "Name, subject or reference" }} />
        </div>
        <ul className="m-0 mt-2 min-h-[120px] flex-1 list-none overflow-y-auto px-3 py-1 min-[768px]:px-5" aria-label="Cases">
          {results === null ? (
            <li className="px-2 py-6 text-center text-sm text-(--ap-muted)">Loading cases...</li>
          ) : results.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-(--ap-muted)">No case matches. Try a different word.</li>
          ) : (
            results.map((c) => {
              const on = pick?.id === c.id;
              return (
                <li key={c.id}>
                  <button type="button" aria-pressed={on} onClick={() => setPick(c)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${on ? "bg-(--ap-tint)" : "hover:bg-(--ap-line-2)"}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{c.subject}</span>
                      <span className="block truncate text-[13px] text-(--ap-muted)">
                        {c.senderName} - <span className="font-mono">{c.reference}</span>
                      </span>
                    </span>
                    {on ? <Check className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-(--ap-line) px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] min-[768px]:px-7 min-[768px]:pb-6">
          {differs ? (
            <p role="status" className="m-0 mb-3 flex items-start gap-1.5 text-[13px] leading-snug text-(--ap-warn)">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This case is for {pick?.senderEmail}. The email came from {item.fromEmail}. Check it is the right case.
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
            <button type="button" disabled={busy} onClick={onClose} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
              Cancel
            </button>
            <button type="button" disabled={!pick || busy} onClick={() => void assign()} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
              {busy ? "Adding..." : "Add to this case"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NeedsHomeCard({ item }: { item: NeedsHomeItem }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    const ok = await confirmAction({
      tone: "caution",
      title: "Dismiss as spam?",
      description: "It leaves this list and is kept for the record. It is not added to any case and the sender is not told.",
      confirmLabel: "Dismiss as spam",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await inboxActions.dismissNeedsHome(item.id);
      toast.add({ title: "Dismissed as spam", type: "success" });
    } catch {
      toast.add({ title: "Could not dismiss it", description: "Nothing changed. Please try again.", type: "error" });
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-(--ap-line) bg-white p-4" data-needs-home={item.id}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 min-w-0 truncate text-[15px] font-bold">
          {item.fromName ?? item.fromEmail}
          {item.fromName ? <span className="ml-1.5 font-normal text-(--ap-muted)">{item.fromEmail}</span> : null}
        </p>
        <time dateTime={item.receivedAt} className="shrink-0 text-[12px] text-(--ap-muted)">
          {listStamp(item.receivedAt)}
        </time>
      </div>
      <h3 className="m-0 mt-1 text-[15px] leading-snug font-semibold wrap-anywhere">{item.subject}</h3>
      <p className="m-0 mt-1 line-clamp-3 text-[14px] leading-relaxed text-(--ap-muted) wrap-anywhere">{item.snippet}</p>
      <p className="m-0 mt-2 text-[12px] text-(--ap-muted)">
        {NEEDS_HOME_REASON[item.reason]}
        {item.attachmentCount > 0 ? ` - ${item.attachmentCount} attachment` : ""}
      </p>
      <div className="mt-3 flex flex-col gap-2 min-[480px]:flex-row min-[480px]:justify-end">
        <button type="button" disabled={busy} onClick={() => void dismiss()} className="ap-btn ap-btn-s h-11 text-[14px] font-semibold">
          Dismiss as spam
        </button>
        <button type="button" disabled={busy} onClick={() => setPicking(true)} className="ap-btn ap-btn-p h-11 text-[14px] font-semibold text-white!">
          Assign to a case
        </button>
      </div>
      {picking ? <CasePickerSheet item={item} onClose={() => setPicking(false)} /> : null}
    </li>
  );
}

export function NeedsHomeView({ state }: { state: InboxLoadable<NeedsHomeItem[]> }) {
  if (state.status === "loading") return <p className="m-0 py-10 text-center text-sm text-(--ap-muted)">Loading...</p>;
  if (state.status === "error") return <ClientPageError title="Needs a home" what="these emails" retry={state.retry} />;
  if (state.status === "restricted") return <EmptyState icon={Mail} title="Not available" description="Only Operations can sort unmatched emails." />;
  if (state.status === "empty" || !state.data) return <EmptyState icon={Check} title="Nothing needs a home" description="Emails that cannot be matched to a case will wait here." />;
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <p className="m-0 mb-3 text-[13px] text-(--ap-muted)">
        Sample emails. Replies that could not be matched to a case wait here until someone adds them to one or dismisses them.
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {state.data.map((i) => (
          <NeedsHomeCard key={i.id} item={i} />
        ))}
      </ul>
    </div>
  );
}
