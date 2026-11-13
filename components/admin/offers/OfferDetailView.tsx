"use client";

/**
 * Offer detail (HR, spec 6.5 / 23.4). Header with the allowed actions, the
 * lifecycle, offer facts, pay terms with Public / Internal visibility, the
 * approval (Operations decides; shown read-only, HR has no approve action),
 * "what the applicant sees", the Convert-to-staff step once Accepted, and the
 * history. Which actions show comes from the adapter's `allowedActions`;
 * hiding a button is presentation only, the backend re-checks every action.
 *
 * Reused: DETAIL_TITLE / EmptyState, confirmAction, ErrorPanel, RowMenu, Disc,
 * AdminAvatar, AttentionBadge, Vacancies Section / Facts / ActivityList.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useUrlParams } from "@/components/admin/applicants/url";
import { Disc } from "@/components/admin/overview/Disc";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Award, Check, ChevronLeft, Exclaim, Pencil, X } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { playAdminSound, type SoundName } from "@/lib/admin/sound";
import { useOfferOutcomeSound } from "@/lib/admin/offers/use-outcome-sound";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { useAccessRole } from "@/lib/admin/role-access";
import { approveOffer, convertOfferToStaff, devSimulateApplicantResponse, devSimulateOperationsApproval, resendOffer, sendOffer, submitOffer, useOffer, withdrawOffer } from "@/lib/admin/offers/hooks";
import type { ConvertInput, OfferAction, OfferDetail } from "@/lib/admin/offers/types";
import { ApplicantPreview } from "./ApplicantPreview";
import { ACTION_LABEL, applicantRecordHref, formatIsoDate, formatYmd, offerEditHref, OFFERS_HREF } from "./meta";
import { ConvertSheet, ResendSheet } from "./OfferSheets";
import { ActivityList, Facts, LifecycleStepper, NeedsConfirmation, OfferStatusChip, OfferStatusPill, Restricted, Section } from "./parts";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction, initialsOf } from "@/components/admin/PhoneDetail";
import { ReasonSheet } from "./Sheet";

const SAVED_TEXT: Record<string, string> = { draft: "The offer was saved as a draft.", updated: "Your changes were saved." };
const PRIMARY: OfferAction[] = ["submit", "approve", "send", "convert"];
type Asking = "withdraw" | "resend" | "convert" | null;

export function OfferDetailView({ id }: { id: string }) {
  const live = useOffer(id);
  const url = useUrlParams();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(() => {
    const t = SAVED_TEXT[url.get("saved")];
    return t ? { kind: "ok", text: t } : null;
  });
  const [asking, setAsking] = useState<Asking>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  // Operations decides; it never "submits for approval" (project lead 2026-10-17). Copy below follows the role; the server enforces it.
  const isOps = useAccessRole() === "operations";
  const [sheetError, setSheetError] = useState<string | null>(null);
  // Accepted -> cork pop, declined -> low thud, when the answer arrives while this page is open (never on first load).
  useOfferOutcomeSound(live.data ? { [live.data.id]: live.data.status } : {});

  if (live.status === "error") {
    return (
      <>
        <Back />
        <ErrorPanel title="We could not load this offer" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <Back />
        <Restricted what="This offer" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Award} title="Offer not found" description="This offer does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  const o = live.data;
  if (!o) return <DetailSkeleton />;

  async function run(work: () => Promise<OfferDetail>, done: string, closeSheet = false, sound?: SoundName) {
    setBusy(true);
    setSheetError(null);
    try {
      const d = await work();
      live.setData(d);
      setNotice({ kind: "ok", text: done });
      if (sound) playAdminSound(sound); // only after the adapter confirmed
      if (closeSheet) setAsking(null);
    } catch {
      const text = "That did not go through. Nothing was changed. Please try again.";
      if (closeSheet) setSheetError(text);
      else setNotice({ kind: "error", text });
    } finally {
      setBusy(false);
    }
  }

  async function start(a: OfferAction) {
    if (!o) return;
    if (a === "withdraw" || a === "resend" || a === "convert") {
      setSheetError(null);
      setAsking(a);
      return;
    }
    if (a === "approve") {
      await confirmAction({
        tone: "neutral",
        title: `Approve the offer for ${o.applicant.name}?`,
        description: "HR can then send the offer to the applicant. The applicant sees nothing until it is sent.",
        points: ["Your decision is recorded with your name and the time.", "Status changes to Approved."],
        confirmLabel: "Approve offer",
        onConfirm: () => run(() => approveOffer(o.id), "The offer was approved. HR can now send it.", false, "approved"),
      });
    } else if (a === "submit") {
      await confirmAction({
        tone: "neutral",
        title: "Submit this offer for approval?",
        description: `Operations reviews the offer for ${o.applicant.name}. You cannot edit it while it waits.`,
        points: ["Status changes from Draft to Submitted for approval.", "HR cannot approve an offer. Operations decides.", "The applicant sees nothing yet."],
        confirmLabel: "Submit for approval",
        onConfirm: () => run(() => submitOffer(o.id), "The offer was submitted for approval."),
      });
    } else if (a === "send") {
      await confirmAction({
        tone: "neutral",
        title: `Send the offer to ${o.applicant.name}?`,
        description: "They get an in-app notification and can review and respond in the Applicant app.",
        points: ["This action does not send an email.", "You can withdraw the offer until it is accepted."],
        confirmLabel: "Send offer",
        onConfirm: () => run(() => sendOffer(o.id), "The offer was sent. The applicant gets an in-app notification.", false, "saved"),
      });
    }
  }

  const primary = o.allowedActions.filter((a) => PRIMARY.includes(a));
  const secondary = o.allowedActions.filter((a) => !PRIMARY.includes(a) && a !== "edit");
  const canEdit = o.allowedActions.includes("edit");
  const mainAction: OfferAction | null = primary[0] ?? null;
  // Phones: the main action is the ONE sticky button; Edit has its own outline action; everything else is in the cover's More menu.
  const phoneMenu = [
    ...primary.slice(1).map((a) => ({ label: ACTION_LABEL[a], onSelect: () => void start(a) })),
    ...secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "withdraw" ? ("danger" as const) : ("default" as const), onSelect: () => void start(a) })),
  ];

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, View applicant / Edit, a short counted list, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref={OFFERS_HREF}
        backLabel="Offers"
        visual={{ kind: "initials", text: initialsOf(o.applicant.name) }}
        title={o.applicant.name}
        status={<OfferStatusPill status={o.status} />}
        line={`${o.role} · ${o.client}, ${o.outlet}`}
        actions={
          <>
            <PhoneAction href={applicantRecordHref(o.applicant.id)} label="Applicant" />
            {canEdit ? <PhoneAction href={offerEditHref(o.id)} label="Edit" icon={<Pencil className="size-4" aria-hidden="true" />} /> : null}
          </>
        }
        menu={
          phoneMenu.length > 0 ? (
            <ActionsMenu quiet alignEnd label="More actions" disabled={busy} triggerClassName={COVER_ROUND} items={phoneMenu} />
          ) : null
        }
      />
      <PhoneFacts
        title="Offer"
        rows={[
          { label: "Role", value: o.role },
          { label: "Vacancy", value: o.vacancy },
          { label: "Starts", value: formatYmd(o.startDate) },
          { label: "Respond by", value: o.expiresAt ? formatYmd(o.expiresAt) : null },
          { label: "Reporting to", value: o.reportingTo || null },
        ]}
      />
      {mainAction || canEdit ? (
        <PhoneStickyAction>
          {mainAction ? (
            <button type="button" disabled={busy} onClick={() => start(mainAction)} className={PD_CTA}>
              {ACTION_LABEL[mainAction]}
            </button>
          ) : (
            <Link href={offerEditHref(o.id)} className={PD_CTA}>
              Edit draft
            </Link>
          )}
        </PhoneStickyAction>
      ) : null}
      <header className="ap-card mb-4 rounded-[20px] p-5 max-[767px]:hidden min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar name={o.applicant.name} photoUrl={o.applicant.photoUrl} size={56} />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{o.applicant.name}</h1>
              <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{o.reference}</p>
              <p className="mt-2 text-[15px] leading-snug break-words">
                <b>{o.role}</b> · {o.vacancy} · {o.client}, {o.outlet}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <OfferStatusChip status={o.status} />
                <span>Starts {formatYmd(o.startDate)}</span>
                {o.expiresAt ? <span>Respond by {formatYmd(o.expiresAt)}</span> : null}
                <Link href={applicantRecordHref(o.applicant.id)} className="ap-hit font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                  View applicant record
                </Link>
              </div>
              {o.needsAttention && o.status === "approved" ? (
                <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-(--ap-ink)">
                  <AttentionBadge className="size-5" halo={false} /> Approved by Operations and ready to send.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[480px] min-[1100px]:justify-end">
            {mainAction ? (
              <button type="button" disabled={busy} onClick={() => start(mainAction)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                {ACTION_LABEL[mainAction]}
              </button>
            ) : canEdit ? (
              <Link href={offerEditHref(o.id)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                <Pencil className="size-4" aria-hidden="true" /> Edit draft
              </Link>
            ) : null}
            <ActionsMenu
              disabled={busy}
              items={[
                ...(mainAction && canEdit ? [{ label: "Edit draft", onSelect: () => router.push(offerEditHref(o.id)) }] : []),
                ...primary.slice(1).map((a) => ({ label: ACTION_LABEL[a], onSelect: () => void start(a) })),
                ...secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "withdraw" ? ("danger" as const) : ("default" as const), onSelect: () => void start(a) })),
              ]}
            />
          </div>
        </div>
      </header>

      {notice ? (
        <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
          <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <PhoneMore title="More details">
      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
        <div className="@container flex min-w-0 flex-col gap-4">
          <Section title="Lifecycle">
            <LifecycleStepper status={o.status} />
            {o.status === "declined" && o.declineReason ? <p className="mt-3 text-[14px] text-(--ap-ink-2)">Reason given by the applicant: {o.declineReason}</p> : null}
            {o.status === "withdrawn" && o.withdrawReason ? <p className="mt-3 text-[14px] text-(--ap-ink-2)">Reason for withdrawing: {o.withdrawReason}</p> : null}
            {o.status === "expired" ? <p className="mt-3 text-[14px] text-(--ap-ink-2)">The applicant did not respond by {o.expiresAt ? formatYmd(o.expiresAt) : "the response date"}.</p> : null}
          </Section>

          <Section title="Approval">
            {o.approval === null ? (
              <p className="text-[14px] text-(--ap-muted)">{isOps ? "Not approved yet. As Head of Operations you can approve it directly." : "Not submitted yet. Once you submit it, Operations reviews it."}</p>
            ) : o.approval.state === "waiting" ? (
              <p className="flex flex-wrap items-center gap-2 text-[15px]">
                {isOps ? (
                  <>
                    <StatusChip tone="warn">Waiting for your decision</StatusChip> HR submitted this offer. Approve it, or withdraw it.
                  </>
                ) : (
                  <>
                    <StatusChip tone="warn">Waiting for Operations</StatusChip> You can withdraw the offer while it waits.
                  </>
                )}
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-[15px]">
                <StatusChip tone="ok">Approved</StatusChip> by <b>{o.approval.by}</b>
                {o.approval.at ? `, ${formatIsoDate(o.approval.at)}` : ""}
              </p>
            )}
            <p className="mt-2.5 text-[13px] text-(--ap-muted)">{isOps ? "HR submits an offer; only Operations approves it (REC-001). You approve directly, so there is nothing to submit." : "Read-only. HR submits an offer; only Operations approves it (REC-001). HR has no approve action."}</p>
          </Section>

          <Section title="Offer details">
            <Facts
              items={[
                { label: "Applicant", value: o.applicant.name },
                { label: "Vacancy", value: o.vacancy },
                { label: "Client and outlet", value: `${o.client}, ${o.outlet}` },
                { label: "Role", value: o.role },
                { label: "Employment type", value: o.employmentType },
                { label: "Location", value: o.location || "Not set" },
                { label: "Reporting to", value: o.reportingTo || "Not set" },
                { label: "Start date", value: formatYmd(o.startDate) },
                { label: "Respond by", value: o.expiresAt ? formatYmd(o.expiresAt) : "No expiry set" },
                { label: "Sent", value: o.sentAt ? formatIsoDate(o.sentAt) : "Not sent" },
                { label: "Viewed", value: o.viewedAt ? formatIsoDate(o.viewedAt) : "Not yet" },
                { label: "Answered", value: o.respondedAt ? formatIsoDate(o.respondedAt) : "Not yet" },
              ]}
            />
          </Section>

          <Section title="Pay terms">
            <ul className="m-0 flex list-none flex-col p-0">
              {o.pay.map((p) => (
                <li key={p.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-(--ap-line-2) py-2.5 last:border-b-0">
                  <span className="min-w-0 text-[15px] break-words">
                    <b>{p.label}</b>
                    <span className="block text-[14px] text-(--ap-ink-2)">{p.value}</span>
                  </span>
                  <StatusChip tone={p.visibility === "public" ? "ok" : "mute"}>{p.visibility === "public" ? "Public" : "Internal only"}</StatusChip>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[13px] text-(--ap-muted)">Public lines are shown to the applicant. Internal-only lines stay with HR and Operations.</p>
          </Section>

          {o.status === "accepted" ? (
            <Section title="Convert to staff">
              {o.activation ? (
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[15px]">
                    <StatusChip tone="warn">Pending activation</StatusChip> Created {formatIsoDate(o.activation.createdAt)} by {o.activation.createdBy}
                  </p>
                  <div className="mt-3">
                    <Facts
                      items={[
                        { label: "Client", value: o.activation.clientName },
                        { label: "Outlet", value: o.activation.outletName },
                        { label: "Role", value: o.activation.role },
                        { label: "Start date", value: formatYmd(o.activation.startDate) },
                      ]}
                    />
                  </div>
                  <p className="mt-3 text-[13px] text-(--ap-muted)">Staff access is added to the same account. It is not active until the placement is confirmed.</p>
                </div>
              ) : (
                <p className="text-[14px] leading-snug text-(--ap-ink-2)">{o.applicant.name} accepted. Convert them to staff to add staff access to the same person and record their first assignment. No second account is created.</p>
              )}
              <div className="mt-3">
                <NeedsConfirmation>Which lifecycle point switches staff access on, and who confirms the placement.</NeedsConfirmation>
              </div>
            </Section>
          ) : null}

          <Section title="History">
            <ActivityList items={o.history} />
          </Section>
        </div>

        <aside className="@container flex min-w-0 flex-col gap-4 min-[1100px]:sticky min-[1100px]:top-4" aria-label="What the applicant sees">
          <Section title="What the applicant sees">
            <ApplicantPreview
              status={o.status}
              data={{ role: o.role, outlet: o.outlet, client: o.client, location: o.location, employmentType: o.employmentType, startDate: o.startDate, reportingTo: o.reportingTo, expiresAt: o.expiresAt, letterFileName: o.letterFileName, pay: o.pay }}
            />
          </Section>
          {SHOW_PROTOTYPE_CONTROLS && (o.status === "pending-approval" || o.status === "sent" || o.status === "viewed") ? <DevControls o={o} busy={busy} run={run} /> : null}
        </aside>
      </div>
      </PhoneMore>

      {asking === "withdraw" ? (
        <ReasonSheet
          title={`Withdraw the offer for ${o.applicant.name}?`}
          description="The offer is taken back and the applicant can no longer respond. The record and its history are kept."
          label="Reason for withdrawing"
          confirmLabel="Withdraw offer"
          danger
          busy={busy}
          error={sheetError}
          onCancel={() => setAsking(null)}
          onSubmit={(reason) => run(() => withdrawOffer(o.id, reason), "The offer was withdrawn.", true, "rejected")}
        />
      ) : null}
      {asking === "resend" ? <ResendSheet offer={o} busy={busy} error={sheetError} onCancel={() => setAsking(null)} onSubmit={(exp) => run(() => resendOffer(o.id, exp), "The offer was resent. The applicant gets an in-app notification.", true, "saved")} /> : null}
      {asking === "convert" ? (
        <ConvertSheet offer={o} busy={busy} error={sheetError} onCancel={() => setAsking(null)} onSubmit={(input: ConvertInput) => run(() => convertOfferToStaff(o.id, input), "A pending staff-activation record was created.", true)} />
      ) : null}
    </div>
  );
}

/** DEV ONLY: stands in for the Operations app and the Applicant app so the whole lifecycle can be exercised. Delete with the mock. */
function DevControls({ o, busy, run }: { o: OfferDetail; busy: boolean; run: (work: () => Promise<OfferDetail>, done: string) => Promise<void> }) {
  const btn = "ap-btn ap-btn-s ap-btn-sm";
  return (
    <section className="rounded-2xl border border-dashed border-(--ap-line) p-4" aria-label="Prototype controls">
      <b className="text-[13px] text-(--ap-muted)">Prototype only: simulate the other side</b>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {o.status === "pending-approval" ? (
          <button type="button" disabled={busy} className={btn} onClick={() => run(() => devSimulateOperationsApproval(o.id), "Simulated: Operations approved the offer.")}>
            Operations approves
          </button>
        ) : null}
        {o.status === "sent" ? (
          <button type="button" disabled={busy} className={btn} onClick={() => run(() => devSimulateApplicantResponse(o.id, "viewed"), "Simulated: the applicant opened the offer.")}>
            Applicant opens it
          </button>
        ) : null}
        {o.status === "sent" || o.status === "viewed" ? (
          <>
            <button type="button" disabled={busy} className={btn} onClick={() => run(() => devSimulateApplicantResponse(o.id, "accepted"), "Simulated: the applicant accepted.")}>
              Applicant accepts
            </button>
            <button type="button" disabled={busy} className={btn} onClick={() => run(() => devSimulateApplicantResponse(o.id, "declined"), "Simulated: the applicant declined.")}>
              Applicant declines
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Back() {
  return (
    <Link href={OFFERS_HREF} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Offers
    </Link>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading offer">
      <Back />
      <div className={`${sk} mb-4 h-[150px]`} />
      <div className={`${sk} mb-4 h-[90px]`} />
      <div className={`${sk} h-[300px]`} />
    </div>
  );
}
