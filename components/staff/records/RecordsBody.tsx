"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { ChevronRight, ShieldCheck, X } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { toast } from "@/components/ui/toast";
import { longDate } from "@/lib/staff/format";
import { useStaffRecords } from "@/lib/staff/hooks";
import { acknowledgeStaffRecord } from "@/lib/staff/service";
import type { StaffRecord } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { ClipboardList } from "../icons";
import { ActionPill, Dot, Facts, PANEL, StateCard, confirmAction } from "../kit";
import { withStaffPreloader } from "../StaffPreloader";
import { RecordsSkeleton } from "./RecordsSkeleton";

/**
 * Warnings & Records (brief section 12). Deliberately neutral: plain labels,
 * calm tones (never red/warn), no stages, strikes, penalties or appeal rules -
 * the type label and wording are authored by Beeliv. Attachments/evidence are
 * not in the data contract yet (TBD), so none are shown.
 *
 * One container, hairline rows; a record opens in a sheet (bottom on phones, side panel on desktop).
 */
function StatusWord({ r }: { r: StaffRecord }) {
  if (r.status === "acknowledged") return <Dot tone="ok">Acknowledged</Dot>;
  if (r.status === "closed") return <Dot tone="mute">Closed</Dot>;
  return <Dot tone="info">{r.requiresAcknowledgement ? "Awaiting your acknowledgement" : "Open"}</Dot>;
}

export function RecordsBody() {
  const { data, status, retry } = useStaffRecords();
  const [openId, setOpenId] = useState<string | null>(null);

  if (status === "loading") return <RecordsSkeleton />;
  if (status === "error")
    return (
      <div className="mx-auto w-full max-w-[760px] pt-1">
        <h1 className="sr-only">Warnings &amp; Records</h1>
        <ErrorPanel title="We couldn't load your records" retry={retry} />
      </div>
    );

  const records = [...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const open = records.find((r) => r.id === openId) ?? null;

  return (
    <div className="w-full pt-1 pb-2">
      <h1 className="text-[28px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[32px]">Warnings &amp; Records</h1>
      <p className="mt-1 mb-5 text-[16px] text-(--ap-muted)">Records relating to your employment that Beeliv has shared with you.</p>

      {status === "empty" || records.length === 0 ? (
        <StateCard icon={ClipboardList} title="No records to show" text="When Beeliv shares a record with you, it appears here. Having nothing here is normal." />
      ) : (
        <ul className={`${PANEL} overflow-hidden min-[1000px]:grid min-[1000px]:grid-cols-2`}>
          {records.map((r) => (
            <li key={r.id} className="border-t border-(--ap-line-2) first:border-t-0 min-[1000px]:[&:nth-child(2)]:border-t-0 min-[1000px]:even:border-l">
              <button type="button" onClick={() => setOpenId(r.id)} className="flex min-h-[84px] w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-(--ap-tint-soft) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset min-[768px]:px-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
                  <ClipboardList className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <b className="text-[16px] text-(--ap-ink)">{r.type}</b>
                    <span className="text-[14px] text-(--ap-muted)">{longDate(r.date)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[15px] text-(--ap-ink-2)">{r.summary}</span>
                  <span className="mt-1.5 block">
                    <StatusWord r={r} />
                  </span>
                </span>
                <ChevronRight className="size-[18px] shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <RecordSheet record={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Detail: bottom sheet on phones, right-hand panel from 768px. */
function RecordSheet({ record, onClose }: { record: StaffRecord | null; onClose: () => void }) {
  // Keep the last record while the sheet animates out.
  const [shown, setShown] = useState<StaffRecord | null>(null);
  if (record && record !== shown) setShown(record);
  const r = record ?? shown;

  async function acknowledge() {
    if (!r) return;
    const ok = await confirmAction({
      tone: "neutral",
      title: "Acknowledge this record?",
      description: "Your acknowledgement is recorded against this record on your Beeliv account.",
      confirmLabel: "Acknowledge",
    });
    if (!ok) return;
    try {
      await withStaffPreloader("save", () => acknowledgeStaffRecord(r.id));
      toast.add({ title: "Acknowledgement recorded", type: "success" });
    } catch {
      toast.add({ title: "We couldn't record that", description: "Please try again.", type: "error" });
    }
  }

  return (
    <Dialog.Root open={record !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-[rgba(17,17,27,.36)] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={`applicant-shell ${newsreader.variable} fixed z-[71] flex flex-col bg-(--ap-surface,#fff) outline-none transition-transform duration-[250ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none max-[767px]:inset-x-0 max-[767px]:bottom-0 max-[767px]:max-h-[86vh] max-[767px]:rounded-t-[22px] max-[767px]:data-ending-style:translate-y-full max-[767px]:data-starting-style:translate-y-full min-[768px]:inset-y-0 min-[768px]:right-0 min-[768px]:w-[460px] min-[768px]:max-w-full min-[768px]:data-ending-style:translate-x-full min-[768px]:data-starting-style:translate-x-full`}
        >
          {r ? (
            <>
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 min-[768px]:px-6 min-[768px]:pt-6">
                <div className="min-w-0">
                  <p className="text-[14px] text-(--ap-muted)">Record</p>
                  <Dialog.Title className="m-0 text-[24px] leading-tight font-bold text-(--ap-ink)">{r.type}</Dialog.Title>
                </div>
                <Dialog.Close aria-label="Close" className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                  <X className="size-5" aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] min-[768px]:px-6">
                <Facts
                  rows={[
                    ["Date", longDate(r.date)],
                    ["Status", <StatusWord key="s" r={r} />],
                  ]}
                />
                <h3 className="mt-5 text-[14px] text-(--ap-muted)">Summary</h3>
                <Dialog.Description className="mt-1.5 text-[16px] leading-relaxed text-(--ap-ink-2)">{r.summary}</Dialog.Description>

                {r.requiresAcknowledgement && r.status === "open" ? (
                  <div className="mt-5 rounded-[22px] bg-(--ap-tint-soft) p-4">
                    <b className="block text-[16px] text-(--ap-ink)">Beeliv asks you to acknowledge this record</b>
                    <p className="mt-1 text-[15px] text-(--ap-ink-2)">Take your time to read it. If anything is unclear, contact Beeliv from Help &amp; support.</p>
                    <ActionPill icon={ShieldCheck} variant="dark" fit onClick={acknowledge} className="mt-4 max-[767px]:w-full">
                      Acknowledge
                    </ActionPill>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
