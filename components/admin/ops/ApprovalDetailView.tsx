"use client";

/**
 * Approval detail (Operations only). Applicant summary, HR recommendation,
 * test and interview scores, document status (NIN and bank are ALWAYS masked,
 * no reveal), offer terms for offers, history. ONE main button (Approve); the
 * More menu holds "Send back with note" and "Reject". Every decision goes
 * through a confirm dialog and success is shown only after the adapter
 * confirms. If someone else decided first the adapter refuses (conflict) and
 * the screen reloads and says so. Which actions show comes from the adapter's
 * `allowedDecisions`; hiding a button is presentation only.
 */
import { SensitiveNote, SensitiveValue } from "@/components/admin/SensitiveValue";
import { STICKY_BAR } from "@/components/admin/listKit";
import Link from "next/link";
import { useState } from "react";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ReasonSheet } from "@/components/admin/offers/Sheet";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { ChevronLeft, FileCheck2 } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { ConflictError, decideApproval, useApproval } from "@/lib/admin/ops/hooks";
import { playAdminSound } from "@/lib/admin/sound";
import type { ApprovalDecision, ApprovalDetail } from "@/lib/admin/ops/types";
import { timeAgo } from "@/lib/client/format";
import { APPROVALS_HREF, applicantRecordHref, DECISION_PAST, formatIsoDate, offerRecordHref, waitingText } from "./meta";
import { ActivityList, ApprovalStatusChip, DocChip, Facts, KindChip, Notice, OpsOnly, Restricted, Section } from "./parts";

type Asking = "send-back" | "reject" | null;
type Msg = { kind: "ok" | "error" | "conflict"; text: string } | null;

export function ApprovalDetailView({ id }: { id: string }) {
  return (
    <OpsOnly what="This approval" fallback={<DetailSkeleton />}>
      <div className="ops-calm"><Inner id={id} /></div>
    </OpsOnly>
  );
}

function Inner({ id }: { id: string }) {
  const live = useApproval(id);
  const [msg, setMsg] = useState<Msg>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  if (live.status === "error") {
    return (
      <>
        <Back />
        <ErrorPanel title="We could not load this approval" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <Back />
        <Restricted what="This approval" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-6">
          <EmptyState icon={FileCheck2} title="Approval not found" description="This request does not exist or is outside your scope." />
        </div>
      </>
    );
  }
  const a = live.data;
  if (!a) return <DetailSkeleton />;

  /** Runs one decision. Success is announced only after the adapter confirms. Returns true when it went through. */
  async function decide(decision: ApprovalDecision, note: string): Promise<boolean> {
    if (!a) return false;
    setBusy(true);
    setSheetError(null);
    try {
      const d = await decideApproval(a.id, { decision, note, expectedRevision: a.revision });
      live.setData(d);
      setAsking(null);
      // Sound only after the adapter confirms: Approve = plate thud, Reject = low thud, Send back = page turn.
      playAdminSound(decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "saved");
      setMsg({ kind: "ok", text: `${DECISION_PAST[decision]}. ${decision === "approve" ? "HR can now continue." : "HR has been told why."} (Nothing is emailed in the demo.)` });
      return true;
    } catch (e) {
      setAsking(null);
      if (e instanceof ConflictError) {
        setMsg({ kind: "conflict", text: "This was already decided by someone else, so your decision was not saved." });
        live.retry();
      } else {
        // Outcome unknown: do not claim nothing changed (docs/contracts/shared-states.md).
        setMsg({ kind: "error", text: "We could not confirm that your decision was saved. Reload the request to check before trying again." });
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!a) return;
    await confirmAction({
      tone: "neutral",
      title: `Approve this ${a.kind} for ${a.applicant.name}?`,
      description: a.kind === "offer" ? "HR can then send the offer to the applicant." : "HR can then continue with the next step for this applicant.",
      points: ["Your decision is recorded with your name and the time.", "It cannot be changed here once saved."],
      confirmLabel: "Approve",
      onConfirm: async () => {
        await decide("approve", "");
      },
    });
  }

  const canApprove = a.allowedDecisions.includes("approve");
  const menu = [
    ...(a.allowedDecisions.includes("send-back") ? [{ label: "Send back with note", onSelect: () => { setSheetError(null); setAsking("send-back"); } }] : []),
    ...(a.allowedDecisions.includes("reject") ? [{ label: "Reject", tone: "danger" as const, onSelect: () => { setSheetError(null); setAsking("reject"); } }] : []),
  ];

  return (
    <div>
      <Back />
      <header className="mb-4 rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-5 min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar name={a.applicant.name} photoUrl={a.applicant.photoUrl} size={56} />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{a.applicant.name}</h1>
              <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{a.reference}</p>
              <p className="mt-2 text-[15px] leading-snug break-words">
                <b>{a.role}</b> · {a.client}, {a.outlet}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <KindChip kind={a.kind} />
                <ApprovalStatusChip status={a.status} />
                <span>{a.status === "waiting" ? waitingText(a.submittedAt) : a.decidedAt ? `Decided ${timeAgo(a.decidedAt)}` : ""}</span>
                <Link href={applicantRecordHref(a.applicant.id)} className="ap-hit font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                  View applicant record
                </Link>
              </div>
            </div>
          </div>
          {a.allowedDecisions.length > 0 ? (
            <div className={`flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:justify-end ${STICKY_BAR}`}>
              <span data-admin-detail="" hidden />
              {canApprove ? (
                <button type="button" disabled={busy} onClick={() => void approve()} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                  Approve
                </button>
              ) : null}
              <ActionsMenu disabled={busy} items={menu} />
            </div>
          ) : null}
        </div>
      </header>

      {msg ? (
        <Notice tone={msg.kind} action={<button type="button" onClick={() => setMsg(null)} className="ap-btn ap-btn-s ap-btn-sm">Dismiss</button>}>
          {msg.text}
        </Notice>
      ) : null}

      {a.decision ? (
        <Section title="Decision" className="mb-4">
          <p className="text-[15px] leading-snug">
            <b>{DECISION_PAST[a.decision.decision]}</b> by <b>{a.decision.by}</b>, {formatIsoDate(a.decision.at)}
          </p>
          {a.decision.note ? <p className="mt-2 text-[14px] break-words text-(--ap-ink-2)">Note: {a.decision.note}</p> : null}
        </Section>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="@container flex min-w-0 flex-col gap-4">
          <Section title="HR recommendation">
            <p className="text-[15px]">
              <b>{a.recommendation.verdict}</b> by {a.recommendation.by}, {formatIsoDate(a.recommendation.at)}
            </p>
            <p className="mt-2 text-[15px] leading-snug break-words text-(--ap-ink-2)">{a.recommendation.note}</p>
          </Section>

          <Section title="Test and interview scores">
            <ScoreList title="Tests" items={a.tests} />
            <div className="mt-4">
              <ScoreList title="Interviews" items={a.interviews} />
            </div>
            <p className="mt-3 text-[13px] text-(--ap-muted)">Scores are shown as HR recorded them. Scales and pass marks need Beeliv confirmation.</p>
          </Section>

          <Section title="Documents">
            <ul className="m-0 flex list-none flex-col p-0">
              {a.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-(--ap-line-2) py-2.5 last:border-b-0">
                  <span className="min-w-0 text-[15px]">
                    <b>{d.label}</b>
                    {d.sensitive ? <span className={d.label.toLowerCase().includes("bank") ? "mt-2 block text-[14px]" : "ml-2 align-middle text-[14px]"}><SensitiveValue label={d.label.toLowerCase().includes("bank") ? "Bank account" : "NIN"} record={`${d.label}, ${a.applicant.name}`} subject={{ kind: "applicant", inScope: true }} /></span> : null}
                  </span>
                  <DocChip state={d.state} />
                </li>
              ))}
            </ul>
            <SensitiveNote className="mt-2.5 text-[13px] text-(--ap-muted)">NIN and bank details are hidden. Reveal asks for a reason and is recorded in Activity.</SensitiveNote>
          </Section>

          {a.offerTerms ? (
            <Section
              title="Offer terms"
              right={
                a.offerId ? (
                  <Link href={offerRecordHref(a.offerId)} className="ap-hit text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                    View full offer
                  </Link>
                ) : undefined
              }
            >
              <Facts items={a.offerTerms} />
              {a.offerPay ? (
                <ul className="m-0 mt-3 flex list-none flex-col p-0">
                  {a.offerPay.map((p) => (
                    <li key={p.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-(--ap-line-2) py-2.5 text-[15px]">
                      <span className="min-w-0">
                        <b>{p.label}</b>
                        <span className="block text-[14px] text-(--ap-ink-2)">{p.value}</span>
                      </span>
                      <span className="text-[12px] font-bold text-(--ap-muted)">{p.visibility === "public" ? "Shown to applicant" : "Internal only"}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          <Section title="History">
            <ActivityList items={a.history.map((h) => ({ ...h, from: null, to: null }))} />
          </Section>
        </div>

        <aside className="@container min-w-0 min-[1100px]:sticky min-[1100px]:top-4" aria-label="Applicant summary">
          <Section title="Applicant">
            <Facts items={a.applicantFacts} />
            <p className="mt-3 text-[13px] text-(--ap-muted)">Submitted by {a.submittedBy}, {formatIsoDate(a.submittedAt)}.</p>
          </Section>
        </aside>
      </div>

      {asking ? (
        <ReasonSheet
          title={asking === "send-back" ? `Send back the ${a.kind} for ${a.applicant.name}?` : `Reject the ${a.kind} for ${a.applicant.name}?`}
          description={asking === "send-back" ? "HR sees your note and can fix the request and submit it again." : "The request is closed. The applicant record and history are kept."}
          label={asking === "send-back" ? "Note for HR" : "Reason for rejecting"}
          confirmLabel={asking === "send-back" ? "Send back" : "Reject"}
          danger={asking === "reject"}
          busy={busy}
          error={sheetError}
          onCancel={() => setAsking(null)}
          onSubmit={(note) => void decide(asking, note)}
        />
      ) : null}
    </div>
  );
}

function ScoreList({ title, items }: { title: string; items: ApprovalDetail["tests"] }) {
  return (
    <div>
      <h3 className="text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1.5 text-[14px] text-(--ap-muted)">None recorded.</p>
      ) : (
        <ul className="m-0 mt-1 flex list-none flex-col p-0">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-(--ap-line-2) py-2.5 last:border-b-0">
              <span className="min-w-0 text-[15px]">
                <b>{s.label}</b>
                <span className="block text-[14px] text-(--ap-ink-2)">{s.detail}</span>
              </span>
              <b className="text-[16px] tabular-nums">{s.score}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Back() {
  return (
    <Link href={APPROVALS_HREF} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Approvals
    </Link>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading approval">
      <Back />
      <div className={`${sk} mb-4 h-[150px]`} />
      <div className={`${sk} mb-4 h-[110px]`} />
      <div className={`${sk} h-[300px]`} />
    </div>
  );
}
