"use client";

/**
 * One warning / record: details, acknowledgement tracking (matches the Staff
 * app, where acknowledging marks the record acknowledged), and history. HR can
 * withdraw it with a reason (confirmAction). Who may issue or withdraw, and the
 * warning ladder, need Beeliv confirmation.
 * Reused: confirmAction, NoticeBanner + RestrictedPanel (interviews), ErrorPanel, Disc.
 */
import Link from "next/link";
import { useState } from "react";
import { NoticeBanner, RestrictedPanel, type Notice } from "@/components/admin/interviews/ui";
import { Disc } from "@/components/admin/overview/Disc";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { ChevronLeft, FileText, X } from "@/components/applicant/icons";
import { DETAIL_TITLE } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { fullDay } from "@/lib/client/format";
import { useWarning, withdrawWarning } from "@/lib/admin/workforce/hooks";
import { AckChip, CARD, DT, Field, H2, HistoryList, NoteSheet, StaffCell, WARNINGS_HREF, WarningStatusChip, WarningStatusPill, stamp } from "./parts";
import { PD_CTA, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction, initialsOf } from "@/components/admin/PhoneDetail";
import { DetailSkeleton, EmptyCard } from "./states";

export function WarningDetail({ id }: { id: string }) {
  const live = useWarning(id);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (live.status === "restricted") return <><Back /><RestrictedPanel title="Warning" what="This record" /></>;
  if (live.status === "error") return <><Back /><ErrorPanel title="We could not load this record" retry={live.retry} /></>;
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <EmptyCard icon={FileText} title="Record not found" description="This record does not exist or is outside your access." />
      </>
    );
  }
  const w = live.data;
  if (!w) return <DetailSkeleton label="Loading record" />;

  async function withdraw(reason: string) {
    const ok = await confirmAction({
      tone: "danger",
      title: `Withdraw this ${w!.type.toLowerCase()} record?`,
      description: "It stays in the history as withdrawn and is no longer active.",
      points: ["Your reason is written to the history.", "The staff member sees it as closed."],
      confirmLabel: "Withdraw record",
      cancelLabel: "Go back",
    });
    if (!ok) return;
    setBusy(true);
    try {
      live.setData(await withdrawWarning(w!.id, { reason }));
      setWithdrawing(false);
      setNotice({ kind: "ok", text: "The record was withdrawn." });
    } catch {
      setWithdrawing(false);
      setNotice({ kind: "error", text: "We could not withdraw the record. Nothing was changed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, a short counted list, ONE sticky action (Withdraw). Details, acknowledgement and history are folded. */}
      <PhoneDetailHead
        backHref={WARNINGS_HREF}
        backLabel="Warnings"
        visual={{ kind: "initials", text: initialsOf(w.staff.name) }}
        title={w.staff.name}
        status={<WarningStatusPill status={w.status} />}
        line={`${w.type} · ${w.outlet}, ${w.client}`}
      />
      <PhoneFacts
        title="Record"
        rows={[
          { label: "Type", value: w.type },
          { label: "Severity", value: w.severity },
          { label: "Effective", value: fullDay(w.effectiveDate) },
          { label: "Issued by", value: w.issuedBy },
          { label: "Acknowledged", value: w.ack === "acknowledged" ? "Yes" : w.ack === "awaiting" ? "Awaiting staff" : "Not required" },
        ]}
      />
      {w.canWithdraw ? (
        <PhoneStickyAction>
          <button type="button" disabled={busy} onClick={() => setWithdrawing(true)} className={PD_CTA}>
            Withdraw record
          </button>
        </PhoneStickyAction>
      ) : null}
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <header className={`${CARD} mb-4 flex flex-wrap items-center gap-4 max-[767px]:hidden`}>
        <Disc icon={FileText} className="size-12" />
        <div className="min-w-0 flex-1">
          <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>
            {w.type}: {w.staff.name}
          </h1>
          <p className="mt-1 text-[14px] text-(--ap-muted)">
            {w.severity} severity, effective {fullDay(w.effectiveDate)}
          </p>
        </div>
        <WarningStatusChip status={w.status} />
      </header>

      <PhoneMore title="Details and history">
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="details-text">
            <h2 id="details-text" className={`${H2} mb-3`}>
              Details
            </h2>
            <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{w.details}</p>
            {w.disputeNote ? (
              <div className="mt-4 border-t border-(--ap-line-2) pt-3">
                <p className={DT}>Staff member&apos;s dispute</p>
                <p className="mt-1 text-[14px] text-(--ap-ink-2)">{w.disputeNote}</p>
              </div>
            ) : null}
            {w.withdrawnReason ? (
              <div className="mt-4 border-t border-(--ap-line-2) pt-3">
                <p className={DT}>Reason withdrawn</p>
                <p className="mt-1 text-[14px] text-(--ap-ink-2)">{w.withdrawnReason}</p>
              </div>
            ) : null}
          </section>

          <section className={CARD} aria-labelledby="history-h">
            <h2 id="history-h" className={`${H2} mb-3`}>
              Activity history
            </h2>
            <HistoryList history={w.history} empty="Nothing has happened to this record yet." />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="actions-h">
            <h2 id="actions-h" className={`${H2} mb-3`}>
              Actions
            </h2>
            {w.canWithdraw ? (
              <button type="button" disabled={busy} onClick={() => setWithdrawing(true)} className="ap-btn ap-btn-s h-11 w-full">
                <X className="size-4" aria-hidden="true" /> Withdraw record
              </button>
            ) : (
              <p className="text-[14px] text-(--ap-muted)">No actions are available for this record.</p>
            )}
            <p className="mt-2.5 text-[13px] text-(--ap-muted)">Who may issue or withdraw warnings, and the warning ladder, need Beeliv confirmation.</p>
          </section>

          <section className={CARD} aria-labelledby="ack-h">
            <h2 id="ack-h" className={`${H2} mb-3`}>
              Acknowledgement
            </h2>
            <div className="flex items-center gap-2">
              <AckChip ack={w.ack} />
            </div>
            <p className="mt-2 text-[14px] text-(--ap-ink-2)">
              {w.ack === "acknowledged" && w.acknowledgedAt
                ? `Acknowledged by ${w.staff.name}, ${stamp(w.acknowledgedAt)}.`
                : w.ack === "awaiting"
                  ? `Waiting for ${w.staff.name} to acknowledge it in the Staff app.`
                  : "The staff member was not asked to acknowledge this record."}
            </p>
          </section>

          <section className={CARD} aria-labelledby="facts-h">
            <h2 id="facts-h" className={`${H2} mb-3`}>
              Record
            </h2>
            <div className="mb-4">
              <StaffCell staff={w.staff} sub={`${w.outlet}, ${w.client}`} />
            </div>
            <dl className="grid grid-cols-1 gap-3 text-[14px] min-[520px]:grid-cols-2 min-[1100px]:grid-cols-1 min-[1280px]:grid-cols-2">
              <Field label="Reference" value={w.reference} />
              <Field label="Status" value={<WarningStatusChip status={w.status} />} />
              <Field label="Type" value={w.type} />
              <Field label="Severity" value={w.severity} />
              <Field label="Issued by" value={w.issuedBy} />
              <Field label="Issued" value={stamp(w.issuedAt)} />
              <Field label="Effective" value={fullDay(w.effectiveDate)} />
            </dl>
          </section>
        </aside>
      </div>
      </PhoneMore>

      {withdrawing ? (
        <NoteSheet
          title="Withdraw this record"
          description="Say why it is being withdrawn. The record stays in the history."
          label="Reason for withdrawing"
          confirmLabel="Continue"
          danger
          busy={busy}
          onCancel={() => setWithdrawing(false)}
          onSubmit={(r) => void withdraw(r)}
        />
      ) : null}
    </div>
  );
}

function Back() {
  return (
    <Link href={WARNINGS_HREF} className="mb-3 inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-(--ap-muted) hover:text-(--ap-ink) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Warnings
    </Link>
  );
}
