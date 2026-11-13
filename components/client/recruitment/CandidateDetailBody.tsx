"use client";

import type { SoundName } from "@/lib/admin/sound";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpLeft, Check, CircleHelp, FileCheck2, MessageSquareText, Video, X } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { EmptyState } from "@/components/applicant/primitives";
import { toast } from "@/components/ui/toast";
import { useCandidate } from "@/lib/client/hooks";
import { dayMonth, fullDate } from "@/lib/client/format";
import { useOutletScope, useOutletState } from "@/lib/client/outlet";
import * as service from "@/lib/client/service";
import type { CandidateDetail, CandidateFeedback } from "@/lib/client/types";
import { PersonPhoto } from "../PersonPhoto";
import { AnalyticsPanel } from "../charts";
import { FEEDBACK_LABEL, FeedbackChip } from "./meta";
import { BackRow, PageError, PageSkeleton } from "./states";
import { StickyActionBar } from "@/components/shared/mobile/StickyActionBar";
import { ClientDocumentActions } from "../compliance/DocumentActions";

const BACK = (
  <BackRow>
    <Link href="/client/recruitment" className="ap-hit inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
      <ArrowUpLeft className="size-4" aria-hidden="true" /> Back to Recruitment
    </Link>
  </BackRow>
);

const DISCLAIMER = "Your feedback informs Beeliv. It does not approve or hire anyone - Beeliv HR makes the final decision.";

const ACTIONS: { key: CandidateFeedback; label: string; icon: typeof Check; tone: "neutral" | "caution"; confirm: string; points: string[] }[] = [
  { key: "interested", label: "Interested", icon: Check, tone: "neutral", confirm: "Send feedback", points: ["Beeliv HR is told you are interested in this candidate.", "This does not approve or hire the candidate."] },
  { key: "interview-requested", label: "Request interview", icon: Video, tone: "neutral", confirm: "Request interview", points: ["Beeliv HR is asked to arrange an interview for you.", "This does not approve or hire the candidate."] },
  { key: "not-suitable", label: "Not suitable", icon: X, tone: "caution", confirm: "Send feedback", points: ["Beeliv HR is told this candidate is not suitable for you.", "You can change your feedback later."] },
];

/**
 * One candidate Beeliv deliberately submitted for review (brief section 15).
 * Only Beeliv-authorised fields are shown - never NIN, banking, contact
 * details or private HR notes; documents are listed by name only. Feedback
 * informs Beeliv and never approves or hires.
 */
export function CandidateDetailBody({ id }: { id: string }) {
  const { data, status, retry } = useCandidate(id);
  const outlet = useOutletState();

  if (status === "loading") return <PageSkeleton title="Candidate" label="Loading candidate" blocks={[150, 200, 260]} />;
  if (status === "error") return <PageError heading="Candidate" title="We couldn't load this candidate" retry={retry} />;
  if (!data) {
    return (
      <div>
        {BACK}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <h1 className="sr-only">Candidate not found</h1>
          <EmptyState icon={CircleHelp} title="Candidate not found" description="This candidate isn't in your outlet scope, or Beeliv has not submitted them for your review." action={<Link href="/client/recruitment" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">View candidates</Link>} />
        </div>
      </div>
    );
  }

  const outletName = outlet.outlets.find((o) => o.id === data.outletId)?.name ?? "";
  return (
    <div>
      {BACK}
      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        <header className="ap-card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[20px] p-5 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:gap-4 min-[768px]:p-6 [&>*:nth-child(n+3)]:col-span-2 [&>*:nth-child(n+3)]:justify-self-start min-[640px]:[&>*:nth-child(n+3)]:col-auto">
          <PersonPhoto name={data.name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[30px]">{data.name}</h1>
            <p className="mt-1 text-[15px] text-(--ap-muted)">
              {data.position}
              {outletName ? ` · ${outletName}` : ""} · Submitted by Beeliv on {dayMonth(data.submittedOn)}
            </p>
          </div>
          <FeedbackChip feedback={data.feedback} />
        </header>

        <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="flex flex-col gap-4 min-[768px]:gap-5">
            <AnalyticsPanel title="Profile summary">
              <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{data.profileSummary}</p>
            </AnalyticsPanel>

            <AnalyticsPanel title="Relevant experience & skills">
              <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{data.experienceSummary}</p>
              <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="Skills">
                {data.skills.map((s) => (
                  <li key={s} className="rounded-full bg-(--ap-tint) px-3 py-1 text-[13px] font-semibold text-(--ap-violet)">
                    {s}
                  </li>
                ))}
              </ul>
            </AnalyticsPanel>

            <AnalyticsPanel title="Interview & assessment summary" subtitle="Written by Beeliv HR">
              <p className="text-[15px] leading-[1.6] text-(--ap-ink-2)">{data.interviewSummary}</p>
            </AnalyticsPanel>

            <AnalyticsPanel title="Approved documents" subtitle="Beeliv has reviewed these and approved sharing them with you">
              <ul className="m-0 flex list-none flex-col gap-2 p-0 max-[767px]:gap-0">
                {data.documents.map((d) => (
                  <li key={d} className="flex items-center gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3.5 py-2.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:border-t max-[767px]:bg-transparent max-[767px]:px-0 max-[767px]:first:border-t-0">
                    <FileCheck2 className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-(--ap-ink)">{d}</span>
                      <ClientDocumentActions ownerId={data.id} ownerName={data.name} documentType={d} className="mt-1.5" />
                    </span>
                    <span className="text-[12px] font-bold text-(--ap-ok)">Approved</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-(--ap-line-2) pt-2.5 text-[12px] text-(--ap-muted)">Identity, banking and medical documents are held securely by Beeliv.</p>
            </AnalyticsPanel>
          </div>

          <div id="feedback" className="scroll-mt-20 contents">
            <FeedbackPanel candidate={data} />
          </div>
        </div>
      </div>
      {/* Phones: one sticky pill jumps to the feedback choices (the tab bar steps aside on this page). */}
      <span data-bv-detail="" hidden />
      <StickyActionBar label={data.feedback ? "Change your feedback" : "Give feedback"} onClick={() => document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </div>
  );
}

function FeedbackPanel({ candidate }: { candidate: CandidateDetail }) {
  const scope = useOutletScope();
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(input: { feedback?: CandidateFeedback; comment?: string }, success: string, sound?: SoundName) {
    if (scope === null) return;
    setBusy(true);
    try {
      await service.submitCandidateFeedback(scope, candidate.id, input);
      toast.add({ title: success, description: "Beeliv HR has been told.", type: "success", data: sound ? { sound } : undefined });
      return true;
    } catch {
      toast.add({ title: "We couldn't send your feedback", description: "Please try again.", type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function choose(a: (typeof ACTIONS)[number]) {
    const ok = await confirmAction({
      tone: a.tone,
      title: `${a.label}: ${candidate.name}?`,
      description: DISCLAIMER,
      points: a.points,
      confirmLabel: a.confirm,
    });
    if (ok) await send({ feedback: a.key }, `Feedback sent: ${FEEDBACK_LABEL[a.key]}`, a.key === "interested" ? "approved" : a.key === "not-suitable" ? "rejected" : undefined);
  }

  async function addComment() {
    const text = comment.trim();
    if (!text) return;
    const ok = await confirmAction({ title: "Send this comment to Beeliv?", description: `"${text.length > 120 ? `${text.slice(0, 120)}...` : text}"`, points: ["Your comment goes to Beeliv HR.", "It does not approve or hire the candidate."], confirmLabel: "Send comment" });
    if (ok && (await send({ comment: text }, "Comment sent"))) {
      setComment("");
      setCommenting(false);
    }
  }

  return (
    <AnalyticsPanel title="Your feedback" subtitle={DISCLAIMER} className="min-[1101px]:self-start">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px] text-(--ap-muted)">
        Current: <FeedbackChip feedback={candidate.feedback} />
      </div>
      <div className="flex flex-col gap-2">
        {ACTIONS.map((a) => {
          const on = candidate.feedback === a.key;
          return (
            <button
              key={a.key}
              type="button"
              disabled={busy}
              aria-pressed={on}
              onClick={() => void choose(a)}
              className={`ap-btn h-12 w-full justify-start gap-2.5 ${on ? "ap-btn-p text-white!" : "ap-btn-s"}`}
            >
              <a.icon className="size-[18px]" aria-hidden="true" /> {a.label}
            </button>
          );
        })}
        <button type="button" aria-expanded={commenting} onClick={() => setCommenting((v) => !v)} className="ap-btn ap-btn-s h-12 w-full justify-start gap-2.5">
          <MessageSquareText className="size-[18px]" aria-hidden="true" /> Add comment
        </button>
      </div>

      {commenting ? (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="cand-comment" className="text-[14px] font-semibold text-(--ap-ink-2)">
            Comment for Beeliv HR
          </label>
          <textarea id="cand-comment" rows={4} maxLength={500} className="ap-input" placeholder="For example: we would like to know their availability." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="button" disabled={busy || !comment.trim()} onClick={() => void addComment()} className="ap-btn ap-btn-p h-12 w-full text-white!">
            Send comment
          </button>
        </div>
      ) : null}

      {candidate.comments.length > 0 ? (
        <div className="mt-4 border-t border-(--ap-line-2) pt-3">
          <h3 className="text-[14px] font-bold text-(--ap-ink)">Your comments</h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {candidate.comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-2.5">
                <p className="text-[14px] leading-snug text-(--ap-ink-2)">{c.text}</p>
                <span className="mt-1 block text-[12px] text-(--ap-muted)">{fullDate(c.createdOn)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}
