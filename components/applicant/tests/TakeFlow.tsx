"use client";

/**
 * The shared "take it" flow for the Applicant Tests and the Staff Forms (mock data only):
 * one question per screen, progress bar, Previous/Next, answers saved on this device as the person goes,
 * every question required, a "Check your answers" review, then Submit (confirmed).
 * Tests with a time limit show a timer (warning at 5 minutes, sent automatically at 0).
 * No score or right/wrong wording is ever shown to the person taking it.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, Clock3, FileCheck2, Pencil } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { useIsClient } from "@/components/applicant/motion";
import { EmptyState, ProgressBar } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { StarRating } from "@/components/shared/StarRating";
import type { AnswerValue } from "@/lib/forms/types";
import { getForm, submitAttempt, useHasSent } from "@/lib/forms/participant-store";
import { describeAnswer, estimateMinutes, formatClock, isAnswered, missingQuestions, useDraft } from "./taker";
import "./take.css";
import { TakerQuestion } from "./TakerQuestion";

export interface TakeFlowProps {
  formId: string;
  takerId: string;
  takerName: string;
  takerType: "applicant" | "staff";
  backHref: string;
  doneHref: string;
  /** When set, a person who has not pressed Start is sent here first (the Applicant intro page). */
  introHref?: string;
  /** Values filled in from the signed-in profile, by question id. The person can change them. */
  prefill?: Record<string, AnswerValue>;
  departments?: string[];
  /** Each app's own pill buttons (Staff passes ActionPill ones). Defaults to the Applicant pills. */
  renderAction?: (a: TakeAction) => React.ReactNode;
}

/**
 * The two kinds of button the flow shows. Each app supplies its own pill through `renderAction` (Staff: ActionPill),
 * so this shared file imports nothing from Staff. Without it the Applicant pills below are used.
 *  - back: outline pill. next: hero pill with icon disc and arrow ("send" is the same hero pill on the review screen).
 *  - `muted` looks unavailable but still answers a tap (it shows the calm "please answer" message).
 */
export interface TakeAction {
  kind: "back" | "next" | "send";
  label: string;
  onClick: () => void;
  muted?: boolean;
  busy?: boolean;
  disabled?: boolean;
}

/** Back and Next are the same size: 52px on phones, 48px on desktop, same width. */
const ACTION_SIZE = "max-[767px]:h-[52px] max-[767px]:min-h-[52px] min-[768px]:h-12 min-[768px]:min-h-12 min-[768px]:w-44 font-bold";

function ApplicantAction(a: TakeAction) {
  if (a.kind === "back") {
    return (
      <button type="button" onClick={a.onClick} disabled={a.disabled} className={`ap-btn ap-btn-o ${ACTION_SIZE}`}>
        <ChevronLeft className="size-[18px]" aria-hidden="true" />
        {a.label}
      </button>
    );
  }
  const Icon = a.kind === "send" ? FileCheck2 : Check;
  return (
    <button type="button" onClick={a.onClick} disabled={a.disabled || a.busy} aria-disabled={a.muted || undefined} className={`ap-btn ap-btn-p ap-btn-hero ${ACTION_SIZE} ${a.muted ? "opacity-60" : ""}`}>
      <Icon className="size-[18px]" aria-hidden="true" />
      {a.label}
    </button>
  );
}

/** Previous / Next row: a sticky bottom bar on phones (equal widths), a right-aligned footer row on desktop. */
const BAR =
  "grid grid-cols-2 gap-3 max-[767px]:fixed max-[767px]:inset-x-0 max-[767px]:bottom-0 max-[767px]:z-30 max-[767px]:border-t max-[767px]:border-(--ap-line) max-[767px]:bg-(--ap-surface,#fff) max-[767px]:px-4 max-[767px]:pt-3 max-[767px]:pb-[calc(12px+env(safe-area-inset-bottom,0px))] min-[768px]:mt-5 min-[768px]:flex min-[768px]:justify-end";

export function TakeFlow(p: TakeFlowProps) {
  const act = p.renderAction ?? ((a: TakeAction) => <ApplicantAction {...a} />);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const router = useRouter();
  const isClient = useIsClient();
  const form = getForm(p.formId);
  const { draft, update } = useDraft(p.takerId, p.formId);
  const sentElsewhere = useHasSent(p.takerId, p.formId);
  const [error, setError] = useState("");
  const [fromReview, setFromReview] = useState(false);
  const sending = useRef(false);
  const [isSending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const total = form?.questions.length ?? 0;
  const answers = useMemo(() => ({ ...(p.prefill ?? {}), ...draft.answers }), [p.prefill, draft.answers]);
  const index = Math.min(Math.max(draft.index, 0), total);
  const onReview = index >= total;
  const noun = form?.kind === "test" ? "test" : "form";

  // Not started yet: the Applicant goes through the intro page; Staff start straight away.
  useEffect(() => {
    if (!isClient || !form || draft.startedAt || draft.submittedAt || sentElsewhere) return;
    if (p.introHref) router.replace(p.introHref);
    else update({ startedAt: new Date().toISOString() });
  }, [isClient, form, draft.startedAt, draft.submittedAt, sentElsewhere, p.introHref, router, update]);

  // Timer (tests with a time limit).
  const deadline = form?.timeLimitMinutes && draft.startedAt ? new Date(draft.startedAt).getTime() + form.timeLimitMinutes * 60_000 : null;
  useEffect(() => {
    if (deadline === null || draft.submittedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline, draft.submittedAt]);
  const remaining = deadline === null ? null : deadline - now;

  function send(auto: boolean) {
    if (!form || sending.current) return;
    sending.current = true;
    setSending(true);
    setSendError(false);
    submitAttempt({
      formId: form.id,
      formVersion: form.version,
      takerId: p.takerId,
      takerName: p.takerName,
      takerType: p.takerType,
      startedAt: draft.startedAt ?? new Date().toISOString(),
      answers,
      otherText: draft.otherText,
    }).then(
      (r) => {
        update({ submittedAt: new Date().toISOString(), submissionId: r.id, autoSubmitted: auto });
        router.push(p.doneHref);
      },
      () => {
        // Answers stay saved on this device; the person can try again.
        sending.current = false;
        setSending(false);
        setSendError(true);
      },
    );
  }

  // Time is up: send what there is. (The ref always points at the latest `send`, so the effect only reacts to the clock.)
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  const timeUp = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (timeUp && !draft.submittedAt && !sentElsewhere && draft.startedAt) sendRef.current(true);
  }, [timeUp, draft.submittedAt, sentElsewhere, draft.startedAt]);

  // Closing or reloading the tab: the browser asks first. Progress is saved on this device either way.
  useEffect(() => {
    if (!draft.startedAt || draft.submittedAt) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft.startedAt, draft.submittedAt]);

  if (!isClient) return <TakeSkeleton />;
  if (!form) {
    return (
      <Column>
        <div className={CARD}>
          <EmptyState
            icon={FileCheck2}
            title="We couldn't find that"
            description="It may have been taken down. Go back to see what is available to you."
            action={<Link href={p.backHref} className="ap-btn ap-btn-p">Back to the list</Link>}
          />
        </div>
      </Column>
    );
  }
  // While our own send is finishing and navigating to the done page, keep the review on screen (no flash of "already sent").
  if ((draft.submittedAt || sentElsewhere) && !isSending) {
    return (
      <Column>
        <div className={CARD}>
          <EmptyState
            icon={FileCheck2}
            art="done"
            title={`This ${noun} has already been sent`}
            description="Thank you. There is nothing more to do here."
            action={<Link href={p.doneHref} className="ap-btn ap-btn-p">See what happens next</Link>}
          />
        </div>
      </Column>
    );
  }
  if (!draft.startedAt) return <TakeSkeleton />;

  const q = onReview ? null : form.questions[index];
  const missing = missingQuestions(form, answers, draft.otherText);
  const warn = remaining !== null && remaining <= 5 * 60_000;

  function go(to: number) {
    setError("");
    setDir(to >= index ? "fwd" : "back");
    update({ index: Math.min(Math.max(to, 0), total) });
    window.scrollTo({ top: 0 });
  }

  function next() {
    if (!q) return;
    if (!isAnswered(q, answers, draft.otherText)) {
      setError(q.type === "email" ? "Please enter a valid email address to continue." : "Please answer this question to continue.");
      return;
    }
    if (fromReview) {
      setFromReview(false);
      go(total);
    } else go(index + 1);
  }

  async function exit() {
    if (Object.keys(draft.answers).length === 0 && remaining === null) {
      router.push(p.backHref);
      return;
    }
    const ok = await confirmAction({
      tone: "neutral",
      icon: Clock3,
      title: "Leave for now?",
      description: remaining !== null ? "Your answers are saved on this device, but the timer keeps running." : "Your answers are saved on this device. Come back any time to carry on where you stopped.",
      confirmLabel: "Leave for now",
      cancelLabel: `Keep going`,
    });
    if (ok) router.push(p.backHref);
  }

  async function sendNow() {
    if (missing.length) return;
    const ok = await confirmAction({
      tone: "neutral",
      icon: FileCheck2,
      title: form!.kind === "test" ? "Submit your test?" : "Send your answers?",
      description: "Once sent, you cannot change your answers.",
      points: [`You have answered all ${total} questions.`],
      confirmLabel: form!.kind === "test" ? "Submit test" : "Send answers",
      cancelLabel: "Not yet",
    });
    if (ok) send(false);
  }

  return (
    <Column>
      <div className="mb-2 flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={exit} className="ap-hit -ml-2 inline-flex h-11 items-center gap-1 rounded-full px-3 text-[15px] font-bold text-(--ap-violet) hover:bg-(--ap-tint)">
          <ChevronLeft className="size-[18px]" aria-hidden="true" />
          Save and leave
        </button>
        {Object.keys(draft.answers).length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--ap-muted)" role="status">
            <Check className="size-3.5 text-(--ap-violet)" strokeWidth={2.5} aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>

      <h1 className="ap-serif mb-3 text-[22px] leading-tight min-[768px]:text-[26px]">{form.title}</h1>

      {remaining !== null ? <TimerBar remaining={remaining} total={(form.timeLimitMinutes ?? 1) * 60_000} warn={warn} /> : null}

      <div className="mb-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <b className="text-[15px]">{onReview ? "Last step" : `Question ${index + 1} of ${total}`}</b>
          <span className="text-[13px] text-(--ap-muted)">
            {onReview
              ? `${total - missing.length} of ${total} answered`
              : remaining === null
                ? `About ${Math.max(1, Math.round((estimateMinutes(form) * (total - index)) / total))} min left`
                : missing.length === 0
                  ? "All answered"
                  : `${total - missing.length} answered`}
          </span>
        </div>
        {total <= 16 ? (
          <div className="flex gap-1.5" role="progressbar" aria-label={onReview ? "Review" : `Question ${index + 1} of ${total}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={onReview ? total : index + 1}>
            {form.questions.map((qq, i) => (
              <i key={qq.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${onReview || i <= index ? "bg-(--ap-violet)" : "bg-(--ap-line-2)"}`} />
            ))}
          </div>
        ) : (
          <ProgressBar percent={onReview ? 100 : ((index + 1) / total) * 100} label={onReview ? "Review" : `Question ${index + 1} of ${total}`} />
        )}
      </div>

      {q ? (
        <section className={`${CARD} take-step`} data-dir={dir} aria-label={`Question ${index + 1} of ${total}`} key={q.id}>
          <TakerQuestion
            question={q}
            value={answers[q.id]}
            onChange={(v) => {
              setError("");
              update({ answers: { ...draft.answers, [q.id]: v } });
            }}
            otherText={draft.otherText[q.id] ?? ""}
            onOtherChange={(t) => {
              setError("");
              update({ otherText: { ...draft.otherText, [q.id]: t } });
            }}
            error={error}
            departments={p.departments}
          />
          {!error && !isAnswered(q, answers, draft.otherText) ? (
            <p className="mt-4 text-[14px] text-(--ap-muted) min-[768px]:text-right">Answer this question to unlock Next.</p>
          ) : null}
        </section>
      ) : (
        <section className={CARD} aria-label="Check your answers">
          <h2 className="ap-serif text-[24px] leading-[1.2] min-[768px]:text-[28px]">Check your answers</h2>
          {missing.length ? (
            <div role="alert" className="mt-3 flex gap-2.5 rounded-xl border border-[#fde68a] bg-(--ap-warn-bg) px-3.5 py-3 text-[15px] text-(--ap-warn)">
              <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              <span>
                {missing.length === 1 ? "1 question still needs an answer" : `${missing.length} questions still need an answer`}. Use Edit on the lines marked below.
              </span>
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-(--ap-muted)">Everything is answered. Read through, then send it when you are ready.</p>
          )}
          <ol className="mt-4 flex flex-col">
            {form.questions.map((qq, i) => {
              const text = describeAnswer(qq, answers, draft.otherText);
              const ok = isAnswered(qq, answers, draft.otherText);
              return (
                <li key={qq.id} className={`flex items-start gap-3 py-3.5 ${i ? "border-t border-(--ap-line-2)" : ""}`}>
                  <span className="mt-0.5 w-6 shrink-0 text-[14px] font-bold text-(--ap-muted)">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[15px] leading-snug">{qq.prompt}</b>
                    {ok && qq.type === "rating" ? (
                      <StarRating className="mt-1 -ml-1" readOnly value={typeof answers[qq.id] === "number" ? (answers[qq.id] as number) : null} scale={qq.ratingMax ?? 5} label={qq.prompt} />
                    ) : ok ? (
                      <p className="mt-1 line-clamp-3 text-[15px] break-words text-(--ap-ink-2)">{text}</p>
                    ) : (
                      <p className="mt-1 text-[15px] font-semibold text-(--ap-rose)">Not answered yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFromReview(true);
                      go(i);
                    }}
                    className="ap-hit inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[14px] font-bold text-(--ap-violet)"
                    aria-label={`Edit answer to question ${i + 1}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </button>
                </li>
              );
            })}
          </ol>
          {sendError ? (
            <p role="alert" className="mt-4 text-[14px] font-semibold text-(--ap-rose)">
              We couldn&apos;t send your answers. They are saved on this device. Try again.
            </p>
          ) : null}
        </section>
      )}

      <div className="max-[767px]:h-24" aria-hidden="true" />
      <div className={BAR}>
        {q
          ? <>
              {act({ kind: "back", label: fromReview ? "Review" : "Previous", onClick: () => go(fromReview ? total : index - 1), disabled: index === 0 && !fromReview })}
              {act({ kind: "next", label: fromReview ? "Save answer" : index === total - 1 ? "Review" : "Next", onClick: next, muted: !isAnswered(q, answers, draft.otherText) })}
            </>
          : <>
              {act({ kind: "back", label: "Previous", onClick: () => go(total - 1) })}
              {act({ kind: "send", label: isSending ? "Sending..." : sendError ? "Try again" : form.kind === "test" ? "Submit test" : "Send", onClick: sendNow, disabled: missing.length > 0 || isSending, busy: isSending })}
            </>}
      </div>
    </Column>
  );
}

function TimerBar({ remaining, total, warn }: { remaining: number; total: number; warn: boolean }) {
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  // Spoken only at the thresholds, not every second.
  const spoken = remaining <= 0 ? "Time is up. Your answers are being sent." : remaining <= 5 * 60_000 ? "5 minutes left." : "";
  return (
    <div className="sticky top-[72px] z-10 -mx-1 mb-3 min-[768px]:top-[88px] rounded-2xl border border-(--ap-line) bg-(--ap-surface,#fff) px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`ap-chip ${warn ? "ap-chip-warn" : "ap-chip-violet"}`}>
          <Clock3 className="size-3.5" aria-hidden="true" />
          Time left {formatClock(remaining)}
        </span>
        <span className="text-[13px] text-(--ap-muted)">{warn ? (remaining <= 0 ? "Time is up. Sending your answers." : "Less than 5 minutes left") : "Your answers send automatically at 0:00"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--ap-line-2)">
        <i className={`block h-full rounded-full ${warn ? "bg-[#d97706]" : "bg-(--ap-violet)"}`} style={{ width: `${pct}%` }} />
      </div>
      <span role="status" className="sr-only">{spoken}</span>
    </div>
  );
}

/** The calm "sent" screen shared by Applicant tests and Staff forms: check disc, what happens next, one pill (passed in by each app). */
export function TakeDone({ title, description, next, action }: { title: string; description: string; next: string[]; action: React.ReactNode }) {
  return (
    <Column>
      <section className={`${CARD} take-step mt-4 text-center`} data-dir="fwd">
        <span className="take-pop mx-auto flex size-20 items-center justify-center rounded-full bg-(--ap-tint-2) text-(--ap-violet)">
          <Check className="size-9" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h1 className="ap-serif mt-5 text-[26px] leading-tight min-[768px]:text-[30px]">{title}</h1>
        <p className="mt-2 text-[16px] text-(--ap-muted)">{description}</p>
        <div className="mt-6 rounded-2xl bg-(--ap-tint) px-5 py-4 text-left">
          <div className="ap-eb mb-2.5">What happens next</div>
          <ul className="flex flex-col gap-2.5">
            {next.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[15px] leading-snug text-(--ap-ink-2)">
                <Check className="mt-0.5 size-4 shrink-0 text-(--ap-violet)" strokeWidth={2} aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex justify-center max-[767px]:[&>*]:w-full">{action}</div>
      </section>
    </Column>
  );
}

export function Column({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[720px]">{children}</div>;
}

export function TakeSkeleton() {
  return (
    <Column>
      <div className="pt-6" aria-busy="true" aria-label="Loading">
        <div className="ap-shimmer h-8 w-48 rounded-xl" />
        <div className="ap-shimmer mt-6 h-2 rounded-full" />
        <div className="ap-shimmer mt-4 h-[320px] rounded-[20px]" />
      </div>
    </Column>
  );
}
