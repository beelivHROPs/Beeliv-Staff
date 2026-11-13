"use client";

/**
 * Applicant "Tests": list, intro, take and done screens (mock data only).
 * Tests are assigned or available from the shared forms store; answers are kept on this device until sent.
 * The applicant never sees a score: a person at Beeliv reads the answers.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Clock3, FileCheck2 } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Chip, DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { CARD, IconTile } from "@/components/applicant/SectionCard";
import { ScreenHeading } from "@/components/applicant/applications/shared";
import { useIsClient } from "@/components/applicant/motion";
import { useApplicantStore } from "@/lib/applicant/service";
import { getForm, listPublishedFor, useFormsVersion, useHasSent } from "@/lib/forms/participant-store";
import { estimateMinutes, statusOf, useDraft, type Draft, useDraftsFor, type TakerStatus } from "./taker";
import { Column, TakeDone, TakeFlow, TakeSkeleton } from "./TakeFlow";

const STATUS: Record<TakerStatus, { label: string; tone: "mute" | "warn" | "ok" }> = {
  "not-started": { label: "Not started", tone: "mute" },
  "in-progress": { label: "In progress", tone: "warn" },
  submitted: { label: "Submitted", tone: "ok" },
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function TestsListBody() {
  useFormsVersion();
  const { profile } = useApplicantStore();
  const isClient = useIsClient();
  const tests = listPublishedFor("applicants");
  const drafts = useDraftsFor(profile.id, tests.map((t) => t.id));

  return (
    <Column>
      <ScreenHeading title="Tests" />
      {!isClient ? (
        <TakeSkeleton />
      ) : tests.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon={FileCheck2}
            title="No tests right now"
            description="When Beeliv asks you to take a test, it will show up here. There is nothing you need to do for now."
            action={<Link href="/applicant/applications" className="ap-btn ap-btn-p ap-btn-sm">View my applications</Link>}
          />
        </div>
      ) : (
        <section className={CARD} aria-label="Your tests">
          <h2 className="ap-serif mb-1 text-[25px]">Your tests</h2>
          <ul>
            {tests.map((t, i) => {
              return (
                <TestRow key={t.id} t={t} draft={drafts[t.id]} first={i === 0} takerId={profile.id} />
              );
            })}
          </ul>
        </section>
      )}
    </Column>
  );
}

function TestRow({ t, draft, first, takerId }: { t: ReturnType<typeof listPublishedFor>[number]; draft: Draft; first: boolean; takerId: string }) {
  // Also "Submitted" when the test was sent inside a job application.
  const sentElsewhere = useHasSent(takerId, t.id);
  const st = STATUS[sentElsewhere ? "submitted" : statusOf(draft)];
  const i = first ? 0 : 1;
  return (
                <li className={i ? "border-t border-(--ap-line-2)" : ""}>
                  <Link href={`/applicant/tests/${t.id}`} className="group flex items-center gap-3.5 py-4 text-(--ap-ink)!">
                    <IconTile icon={FileCheck2} />
                    <span className="min-w-0 flex-1">
                      <b className="block text-[17px] leading-snug">{t.title}</b>
                      <span className="mt-0.5 block text-[14px] text-(--ap-muted)">
                        {plural(t.questions.length, "question")} · about {plural(estimateMinutes(t), "minute")}
                      </span>
                      <span className="mt-2 inline-flex min-[640px]:hidden">
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </span>
                    </span>
                    <span className="hidden min-[640px]:inline-flex">
                      <Chip tone={st.tone}>{st.label}</Chip>
                    </span>
                    <ArrowRight className="size-5 shrink-0 text-(--ap-violet) transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
  );
}

export function TestIntroBody({ id }: { id: string }) {
  const router = useRouter();
  const { profile } = useApplicantStore();
  const isClient = useIsClient();
  const form = getForm(id);
  const { draft, update } = useDraft(profile.id, id);
  const sentElsewhere = useHasSent(profile.id, id);

  if (!isClient) return <TakeSkeleton />;
  if (!form) {
    return (
      <Column>
        <div className={`${CARD} mt-4`}>
          <EmptyState
            icon={FileCheck2}
            title="We couldn't find that test"
            description="It may have been taken down. Your other tests are on the list."
            action={<Link href="/applicant/tests" className="ap-btn ap-btn-p">Back to my tests</Link>}
          />
        </div>
      </Column>
    );
  }

  const status = sentElsewhere ? "submitted" : statusOf(draft);
  const n = form.questions.length;
  const minutes = estimateMinutes(form);

  async function start() {
    if (!form) return;
    if (status === "not-started") {
      if (form.timeLimitMinutes) {
        const ok = await confirmAction({
          tone: "caution",
          icon: Clock3,
          title: "Start the timer?",
          description: `You will have ${plural(form.timeLimitMinutes, "minute")}. The clock starts as soon as you begin and keeps running if you leave.`,
          points: ["Your answers are sent automatically when time runs out.", "You can only take this test once."],
          confirmLabel: "Start test",
          cancelLabel: "Not yet",
        });
        if (!ok) return;
      }
      update({ startedAt: new Date().toISOString(), index: 0 });
    }
    router.push(`/applicant/tests/${id}/take`);
  }

  const expect = [
    `${plural(n, "question")}, one at a time.`,
    form.timeLimitMinutes ? `You have ${plural(form.timeLimitMinutes, "minute")} in total.` : `About ${plural(minutes, "minute")}. There is no time limit.`,
    "Every question needs an answer before you can send the test.",
    "Your answers are saved on this device as you go, so you can stop and carry on later.",
    "You can check and change your answers before you send them.",
  ];

  return (
    <Column>
      <Link href="/applicant/tests" className="ap-hit mt-3 -ml-1 inline-flex h-11 items-center gap-1.5 px-1 text-[15px] font-bold text-(--ap-violet)">
        <ChevronLeft className="size-[18px]" aria-hidden="true" />
        My tests
      </Link>
      <section className={`${CARD} mt-1`}>
        <Chip tone={STATUS[status].tone}>{STATUS[status].label}</Chip>
        <h1 className={`${DETAIL_TITLE} mt-3`}>{form.title}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-(--ap-muted)">{form.description}</p>

        {status === "submitted" ? (
          <>
            <p className="mt-5 text-[16px]">You have already sent this test. Thank you. Beeliv will be in touch about next steps.</p>
            <Link href={`/applicant/tests/${id}/done`} className="ap-btn ap-btn-p mt-5 h-12 w-full min-[768px]:w-auto">What happens next</Link>
          </>
        ) : (
          <>
            <div className="ap-eb mt-6 mb-3">What to expect</div>
            <ul className="flex flex-col gap-2.5 rounded-xl bg-(--ap-tint) px-4 py-4">
              {expect.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px] leading-snug text-(--ap-ink-2)">
                  <Check className="mt-0.5 size-4 shrink-0 text-(--ap-violet)" strokeWidth={2} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] text-(--ap-muted)">A person at Beeliv reads your answers. There is no score shown to you.</p>
            <button type="button" onClick={start} className="ap-btn ap-btn-p ap-btn-hero mt-6 w-full min-[768px]:w-auto min-[768px]:min-w-48">
              {status === "in-progress" ? "Continue test" : "Start test"}
            </button>
          </>
        )}
      </section>
    </Column>
  );
}

export function TestTakeBody({ id }: { id: string }) {
  const { profile } = useApplicantStore();
  return (
    <TakeFlow
      formId={id}
      takerId={profile.id}
      takerName={profile.fullName}
      takerType="applicant"
      backHref="/applicant/tests"
      doneHref={`/applicant/tests/${id}/done`}
      introHref={`/applicant/tests/${id}`}
    />
  );
}

export function TestDoneBody({ id }: { id: string }) {
  const { profile } = useApplicantStore();
  const isClient = useIsClient();
  const { draft } = useDraft(profile.id, id);
  const sentElsewhere = useHasSent(profile.id, id);
  if (!isClient) return <TakeSkeleton />;

  if (!draft.submittedAt && !sentElsewhere) {
    return (
      <Column>
        <div className={`${CARD} mt-4`}>
          <EmptyState
            icon={FileCheck2}
            title="This test has not been sent yet"
            description="Open the test to carry on where you stopped."
            action={<Link href={`/applicant/tests/${id}`} className="ap-btn ap-btn-p">Open the test</Link>}
          />
        </div>
      </Column>
    );
  }

  return (
    <TakeDone
      title="Thank you, your test has been sent"
      description={draft.autoSubmitted ? "Time ran out, so we sent the answers you had given." : "We have your answers safely."}
      next={["A person at Beeliv reads your answers.", "Beeliv will be in touch about the next step.", "You do not need to do anything else for now."]}
      action={
        <Link href="/applicant/tests" className="ap-btn ap-btn-p ap-btn-hero h-12">
          <Check className="size-[18px]" aria-hidden="true" />
          Back to my tests
        </Link>
      }
    />
  );
}
