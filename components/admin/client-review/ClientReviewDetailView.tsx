"use client";

/**
 * Client Review detail (HR, spec 6.5). Candidate summary (masked), exactly what
 * the client sees in their profile pack, the client's feedback and comments,
 * submission details and history. Actions: Submit to client, Withdraw
 * submission, Record client feedback received outside the app, Return to
 * shortlist. HR never approves selection: the client's answer informs Beeliv
 * and Operations decides (REC-001). Which actions show comes from the adapter
 * (`capabilities`); the backend re-checks every action.
 *
 * Reused: Section / Facts / ActivityList / Restricted (vacancies parts),
 * AdminAvatar, Client StatusChip, RowMenu, EmptyState, ErrorPanel.
 */
import Link from "next/link";
import { useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ActivityList, Facts, Restricted, Section } from "@/components/admin/vacancies/parts";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { CircleHelp, FileCheck2, LockKeyhole } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { performApplicantAction } from "@/lib/admin/applicants/hooks";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useClientReview } from "@/lib/admin/client-review/hooks";
import type { ClientReviewDetail } from "@/lib/admin/client-review/types";
import { applicantHref } from "@/lib/admin/links";
import { ACTION_LABEL, useReviewActions, type ReviewAction } from "./actions";
import { dateTime, daysText, LIST_HREF, ReviewChip, submittedOn } from "./meta";
import { BackLink, DetailSkeleton, NoticeBanner, type Notice } from "./parts";

const BACK = <BackLink href={LIST_HREF} label="Client Review" />;

export function ClientReviewDetailView({ id }: { id: string }) {
  const live = useClientReview(id);
  const [notice, setNotice] = useState<Notice | null>(null);
  const actions = useReviewActions({
    onDone: (d, text) => {
      live.setData(d);
      setNotice({ kind: "ok", text });
    },
    onError: (text) => setNotice({ kind: "error", text }),
  });

  async function moveToPool(name: string, applicantId: string) {
    await confirmAction({
      tone: "neutral",
      title: `Move ${name} to the Talent Pool?`,
      description: "They stay on record and can be matched to future roles. Their application and history are kept.",
      points: ["The move is written to their activity history."],
      confirmLabel: "Move to Talent Pool",
      onConfirm: async () => {
        try {
          await performApplicantAction(applicantId, { action: "talent-pool" });
          setNotice({ kind: "ok", text: `${name} was moved to the Talent Pool.` });
        } catch {
          setNotice({ kind: "error", text: `We could not move ${name}. Nothing was changed. Please try again.` });
        }
      },
    });
  }

  if (live.status === "error") {
    return (
      <>
        {BACK}
        <ErrorPanel title="We could not load this submission" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {BACK}
        <Restricted what="This submission" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        {BACK}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <h1 className="sr-only">Submission not found</h1>
          <EmptyState icon={CircleHelp} title="Submission not found" description="This submission does not exist or is outside your assigned clients and outlets." action={<Link href={LIST_HREF} className="ap-btn ap-btn-s ap-btn-sm">Back to Client Review</Link>} />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) return <DetailSkeleton label="Client Review" />;

  const target = { id: d.id, name: d.candidateName, contacts: d.contacts };
  const cap = d.capabilities;
  const secondary: ReviewAction[] = [];
  if (cap.canRecordFeedback) secondary.push("record");
  if (cap.canWithdraw) secondary.push("withdraw");
  if (cap.canReturnToShortlist) secondary.push("return");

  return (
    <div>
      {BACK}
      <header className="ap-card mb-4 rounded-[20px] p-5 min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar name={d.candidateName} photoUrl={d.photoUrl} size={64} />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.candidateName}</h1>
              <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{d.applicantReference}</p>
              <p className="mt-2 text-[15px] leading-snug break-words">
                {d.vacancy} · <b>{d.client}</b>
                {d.outlet && d.outlet !== d.client ? `, ${d.outlet}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <ReviewChip status={d.status} decision={d.decision} />
                {d.recordedByHr ? <span>Recorded by HR</span> : null}
                <span>Submitted: {submittedOn(d.submittedAt)}</span>
                {d.daysWaiting !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    {d.overdue ? <AttentionBadge className="size-5" halo={false} /> : null}
                    Waiting {daysText(d.daysWaiting)}
                    {d.overdue ? " (overdue)" : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[460px] min-[1100px]:justify-end">
            {cap.canSubmit ? (
              <button type="button" disabled={actions.busy} onClick={() => actions.start(target, "submit")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                {ACTION_LABEL.submit}
              </button>
            ) : null}
            <Link href={applicantHref(d.applicantId)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
              View applicant
            </Link>
            {d.decision === "not-suitable" && d.status === "submitted" ? (
              <button type="button" onClick={() => void moveToPool(d.candidateName, d.applicantId)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                Move to Talent Pool
              </button>
            ) : null}
            {secondary.length > 0 ? <RowMenu label={`More actions for ${d.candidateName}`} items={secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "withdraw" ? ("danger" as const) : ("default" as const), onSelect: () => actions.start(target, a) }))} /> : null}
          </div>
        </div>
        <p className="mt-4 border-t border-(--ap-line-2) pt-3 text-[13px] text-(--ap-muted)">The client&apos;s answer informs Beeliv. It does not approve or hire anyone. Final approval belongs to Operations.</p>
      </header>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Candidate summary">
            <div className="@container">
              <Facts
                items={[
                  { label: "Applying for", value: d.vacancy },
                  { label: "Client / outlet", value: `${d.client}${d.outlet && d.outlet !== d.client ? `, ${d.outlet}` : ""}` },
                  { label: "Experience", value: d.experienceYears === null ? "Not set" : `${d.experienceYears} years` },
                  {
                    label: "Identity number",
                    value: (
                      <span className="inline-flex items-center gap-1.5 text-(--ap-muted)">
                        <LockKeyhole className="size-3.5" aria-hidden="true" /> {d.identityMasked}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
            <p className="mt-3 text-[13px] text-(--ap-muted)">Identity and banking details stay hidden here and are never shared with the client.</p>
          </Section>

          <Section title="What the client sees">
            <p className="mb-3 text-[13px] text-(--ap-muted)">This is the profile pack the client opens from their Recruitment page. Only Beeliv-approved fields are shown.</p>
            <div className="flex flex-col gap-4">
              <Block title="Profile summary">
                <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{d.pack.profileSummary}</p>
              </Block>
              <Block title="Relevant experience and skills">
                <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{d.pack.experienceSummary}</p>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="Skills">
                  {d.pack.skills.map((s) => (
                    <li key={s} className="rounded-full bg-(--ap-tint) px-3 py-1 text-[13px] font-semibold text-(--ap-violet)">
                      {s}
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="Interview and assessment summary">
                <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{d.pack.interviewSummary}</p>
              </Block>
              <Block title="Approved documents (names only)">
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {d.pack.documents.map((n) => (
                    <li key={n} className="flex items-center gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3.5 py-2.5">
                      <FileCheck2 className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--ap-ink)">{n}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            </div>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <FeedbackSection d={d} />
          <Section title="Submission">
            <Facts items={[{ label: "Sent to", value: d.submittedTo ? `${d.submittedTo.name}, ${d.submittedTo.role}` : "Not submitted" }, { label: "Note to the client", value: d.submissionNote ?? "None" }]} />
          </Section>
          <Section title="History">
            <ActivityList items={d.history.map((h) => ({ id: h.id, actor: h.actor, at: h.at, action: h.action, from: h.from, to: h.to, reason: h.note ?? undefined }))} />
          </Section>
        </div>
      </div>
      {actions.dialog}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[14px] font-bold text-(--ap-ink)">{title}</h3>
      {children}
    </div>
  );
}

function FeedbackSection({ d }: { d: ClientReviewDetail }) {
  return (
    <Section title="Client feedback">
      <div className="flex flex-wrap items-center gap-2 text-[14px] text-(--ap-muted)">
        Current: <ReviewChip status={d.status} decision={d.decision} />
      </div>
      {d.status === "submitted" && d.decision === "awaiting" ? <p className="mt-3 text-[14px] text-(--ap-muted)">The client has not answered yet. If they answered by phone or in person, use Record client feedback.</p> : null}
      {d.comments.length === 0 ? (
        <p className="mt-3 text-[14px] text-(--ap-muted)">No comments from the client.</p>
      ) : (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {d.comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-2.5">
              <p className="text-[14px] leading-snug break-words text-(--ap-ink-2)">{c.text}</p>
              <span className="mt-1 block text-[12px] text-(--ap-muted)">
                {c.source === "recorded-by-hr" ? `Recorded by ${c.by}` : c.by}, {dateTime(c.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
