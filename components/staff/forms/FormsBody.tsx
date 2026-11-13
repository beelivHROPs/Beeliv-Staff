"use client";

/**
 * Staff "Forms": list, take and done screens (mock data only), e.g. the Brunch Lane staff appraisal.
 * It is a survey: no score, no right or wrong answers. The same take flow as the Applicant tests
 * (components/applicant/tests/TakeFlow), with name, department and email filled in from the signed-in staff profile.
 * The take screen itself is the shared Applicant flow, so its inner buttons keep the Applicant style.
 */
import { useMemo } from "react";
import { Check, FileCheck2 } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { getForm, listPublishedFor, useFormsVersion } from "@/lib/forms/participant-store";
import { estimateMinutes, statusOf, useDraft, useDraftsFor, type TakerStatus } from "@/components/applicant/tests/taker";
import { Column, TakeDone, TakeFlow, TakeSkeleton, type TakeAction } from "@/components/applicant/tests/TakeFlow";
import { useCurrentAssignment, useStaffProfile } from "@/lib/staff/hooks";
import { SAMPLE_DEPARTMENTS } from "@/lib/forms/participant-store";
import type { AnswerValue } from "@/lib/forms/types";
import type { ParticipantForm } from "@/lib/forms/participant-store";
import { ActionPill, Dot, PANEL, Sk, StateCard } from "../kit";

/** Mock list of departments, the same sample list Admin uses (the real list comes from Beeliv, not yet supplied). */
const DEPARTMENTS = SAMPLE_DEPARTMENTS;

const WORD: Record<TakerStatus, { word: string; tone: "info" | "warn" | "ok"; action: string }> = {
  "not-started": { word: "Not started", tone: "info", action: "Start" },
  "in-progress": { word: "In progress", tone: "warn", action: "Continue" },
  submitted: { word: "Sent", tone: "ok", action: "View" },
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * Forms for staff. Prototype: every published staff / client-staff form is shown, with the client's name on the row.
 * TBD: limit client forms to staff placed with that client once Admin can assign a form to people
 * (the mock Staff assignment is Kalina, not Brunch Lane, so filtering by client would hide the only sample form).
 */
function useStaffForms(): { forms: ParticipantForm[]; ready: boolean } {
  useFormsVersion();
  // New staff in onboarding have no forms yet (the appraisal fixture belongs to placed staff). Onboarding agreements live on Home.
  const onboarding = useStaffProfile().data?.accountStatus === "onboarding";
  return { forms: onboarding ? [] : listPublishedFor("staff"), ready: true };
}

export function FormsListBody() {
  const { data: profile } = useStaffProfile();
  const isClient = useIsClient();
  const { forms, ready } = useStaffForms();
  const drafts = useDraftsFor(profile?.id ?? "", forms.map((f) => f.id));

  return (
    <div className="flex w-full flex-col gap-5 pt-2 pb-2">
      <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink) max-[767px]:sr-only">Forms</h1>
      {!isClient || !ready || !profile ? (
        <div aria-busy="true" aria-label="Loading your forms">
          <Sk className="h-[190px]" />
        </div>
      ) : forms.length === 0 ? (
        <StateCard icon={FileCheck2} title="No forms right now" text="When Beeliv or your outlet asks you to fill in a form, such as a staff survey, it will show up here." />
      ) : (
        <ul className={`${PANEL} overflow-hidden min-[1000px]:grid min-[1000px]:grid-cols-2`} aria-label="Your forms">
          {forms.map((f) => {
            const s = statusOf(drafts[f.id]);
            const w = WORD[s];
            return (
              <li key={f.id} className="border-t border-(--ap-line-2) p-4 first:border-t-0 min-[768px]:p-5 min-[1000px]:[&:nth-child(2)]:border-t-0 min-[1000px]:even:border-l">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
                    <FileCheck2 className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 leading-snug">
                    <b className="block text-[17px] text-(--ap-ink)">{f.title}</b>
                    <span className="block text-[14px] text-(--ap-muted)">
                      {f.clientName ? `${f.clientName} · ` : ""}
                      {plural(f.questions.length, "question")} · about {plural(estimateMinutes(f), "minute")}
                    </span>
                    <span className="mt-1 block">
                      <Dot tone={w.tone}>{w.word}</Dot>
                    </span>
                  </div>
                </div>
                <ActionPill href={s === "submitted" ? `/staff/forms/${f.id}/done` : `/staff/forms/${f.id}`} variant={s === "submitted" ? "outline" : "dark"} compact className="mt-3.5 max-[767px]:w-full" ariaLabel={`${w.action}: ${f.title}`}>
                  {w.action}
                </ActionPill>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function FormTakeBody({ id }: { id: string }) {
  const { data: profile } = useStaffProfile();
  const assignment = useCurrentAssignment();
  const form = getForm(id);
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : "";
  const department = assignment.data?.department ?? "";
  const email = profile?.email ?? "";

  // Filled in from the staff profile; the person can still change them.
  const prefill = useMemo(() => {
    const out: Record<string, AnswerValue> = {};
    for (const q of form?.questions ?? []) {
      if (q.type === "email" && email) out[q.id] = email;
      else if (q.optionsSource === "departments" && department) out[q.id] = department;
      else if (q.type === "short" && /full name|^name$/i.test(q.prompt) && fullName) out[q.id] = fullName;
    }
    return out;
  }, [form, email, department, fullName]);

  if (!profile || assignment.status === "loading") return <TakeSkeleton />;
  return (
    <TakeFlow
      formId={id}
      takerId={profile.id}
      takerName={fullName}
      takerType="staff"
      backHref="/staff/forms"
      doneHref={`/staff/forms/${id}/done`}
      prefill={prefill}
      departments={DEPARTMENTS}
      renderAction={renderStaffAction}
    />
  );
}

/** Staff pills for the take flow: Previous = outline pill, Next / Send = hero pill with icon disc and arrow. 52px on phones, 48px on desktop, equal width. */
const STAFF_SIZE = "max-[767px]:h-[52px] max-[767px]:min-h-[52px] min-[768px]:h-12 min-[768px]:w-44 w-full justify-center text-center!";
function renderStaffAction(a: TakeAction) {
  if (a.kind === "back") {
    return (
      <ActionPill key="back" variant="outline" compact arrow={false} disabled={a.disabled} onClick={a.onClick} className={STAFF_SIZE}>
        {a.label}
      </ActionPill>
    );
  }
  return (
    <ActionPill key={a.kind} variant="purple" compact icon={a.kind === "send" ? FileCheck2 : Check} loading={a.busy} disabled={a.disabled && !a.busy} onClick={a.onClick} className={`${STAFF_SIZE} ${a.muted ? "opacity-60" : ""}`}>
      {a.label}
    </ActionPill>
  );
}

export function FormDoneBody({ id }: { id: string }) {
  const { data: profile } = useStaffProfile();
  const isClient = useIsClient();
  const { draft } = useDraft(profile?.id ?? "", id);
  if (!isClient || !profile) return <TakeSkeleton />;

  if (!draft.submittedAt) {
    return (
      <Column>
        <div className="mt-4">
          <StateCard
            icon={FileCheck2}
            title="This form has not been sent yet"
            text="Open it to carry on where you stopped."
            action={
              <ActionPill href={`/staff/forms/${id}`} variant="dark" compact className="w-full">
                Open the form
              </ActionPill>
            }
          />
        </div>
      </Column>
    );
  }

  return (
    <TakeDone
      title="Thank you, your answers have been sent"
      description="We have your answers safely."
      next={["Your answers go to the Beeliv team.", "Nothing else is needed from you for now."]}
      action={
        <ActionPill href="/staff/forms" variant="purple" fit icon={Check}>
          Back to my forms
        </ActionPill>
      }
    />
  );
}
