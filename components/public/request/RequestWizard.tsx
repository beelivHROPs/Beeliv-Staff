"use client";

/**
 * The Request Talent form: a genuine 4-step wizard (Your business / What you
 * need / Your requirement / Contact details).
 *
 * - State lives in one Draft, mirrored to sessionStorage (this tab only) so a
 *   refresh or browser Back/Forward keeps the answers. It is cleared on submit.
 * - Each step is a history entry (window.history.pushState with { rqStep }), so
 *   the browser Back/Forward buttons move between steps. A step can only be
 *   reached when every earlier step is valid.
 * - Continue validates the step, shows inline errors and focuses the first
 *   invalid field. Enter continues. Completed steps show a summary card with
 *   Edit (returns to that step).
 * - The last step calls submitRequest() (lib/public-site/request.ts, backend
 *   not connected yet) and then opens /request/sent.
 *
 * Until the client has read sessionStorage the form area shows the loading
 * skeleton, so a refresh never flashes step 1 before jumping to the saved step.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { FormAlert, useFieldRefs } from "@/components/public/auth/fields";
import { DUR, EASE, usePrefersReducedMotion } from "@/components/public/motion";
import { T } from "@/components/public/primitives";
import { submitRequest } from "@/lib/public-site/request";
import type { NeedId } from "@/lib/public-site/request";
import {
  MESSAGES,
  NAV_UI,
  NEEDS,
  NEED_PARAM_VALUES,
  REQUEST_ROUTES,
  STEPS,
  STEP_COUNT,
  type StepNumber,
} from "@/lib/public-site/request-content";
import { clearDraft, loadDraft, saveDraft, saveSent } from "@/lib/public-site/request-draft";
import {
  FIELD_ORDER,
  buildInput,
  businessSummary,
  emptyDraft,
  furthestValidStep,
  localIsoDate,
  requirementSummary,
  toggleNeed,
  validateStep,
  type Draft,
  type Errors,
  type FieldKey,
} from "@/lib/public-site/request-rules";
import { cn } from "@/lib/utils";
import { FormFrame } from "./FormFrame";
import { RequestFormSkeleton } from "./RequestFormSkeleton";
import {
  MobileProgress,
  RqButton,
  StepIndicator,
  SummaryCard,
  UpcomingCard,
} from "./parts";
import {
  BusinessFields,
  ContactFields,
  Item,
  NeedsFieldset,
  RequirementFields,
  StepFieldset,
  type FieldProps,
  type TextKey,
} from "./StepFields";

/* ------------------------------ text helpers ------------------------------- */

function readText(d: Draft, k: TextKey): string {
  if (k === "details") return d.details;
  const [g, f] = k.split(".") as ["business" | "recruitment" | "training" | "contact", string];
  return (d[g] as Record<string, string>)[f];
}

function writeText(d: Draft, k: TextKey, v: string): Draft {
  if (k === "details") return { ...d, details: v };
  const [g, f] = k.split(".") as ["business" | "recruitment" | "training" | "contact", string];
  return { ...d, [g]: { ...d[g], [f]: v } } as Draft;
}

const noopSubscribe = () => () => {};

const isNeedParam = (v: string | undefined): v is NeedId =>
  !!v && (NEED_PARAM_VALUES as readonly string[]).includes(v);

/* --------------------------------- motion ---------------------------------- */

const bodyV: Variants = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: DUR.fast, ease: EASE, staggerChildren: 0.08 },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -20,
    transition: { duration: 0.3, ease: EASE },
  }),
};

/* --------------------------------- wizard ---------------------------------- */

export function RequestWizard({ need }: { need?: string }) {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const clientReady = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState<Partial<Record<StepNumber, boolean>>>({});
  const [shake, setShake] = useState<Partial<Record<FieldKey, number>>>({});
  const [dir, setDir] = useState(1);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const step = draft.step;
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const submitted = useRef(false);
  const stepRef = useRef<StepNumber>(1);
  const draftRef = useRef<Draft>(draft);
  // Mirrors for the popstate handler / callbacks (they must not close over stale state).
  useEffect(() => {
    stepRef.current = step;
    draftRef.current = draft;
  });
  const { register, focusFirstInvalid } = useFieldRefs<FieldKey>();

  /* ---- restore (draft, or the ?need= preselect) once the client can read storage ---- */
  // The server and the hydration render see `clientReady === false` (skeleton); the
  // next render is the first that may read sessionStorage. Derived-state pattern:
  // set state during render, guarded so it runs once.
  if (clientReady && !ready) {
    const saved = loadDraft();
    let next = saved ?? emptyDraft();
    // ?need= only preselects when the visitor has not chosen anything yet.
    if (isNeedParam(need) && next.needs.length === 0) next = { ...next, needs: [need] };
    next = { ...next, step: furthestValidStep(next.step, next) };
    setDraft(next);
    setReady(true);
  }
  // Give the current history entry its step (a refresh keeps it; Back/Forward reads it).
  useEffect(() => {
    if (ready) window.history.replaceState({ rqStep: draftRef.current.step }, "");
  }, [ready]);

  /* ---- persist -------------------------------------------------------------- */
  useEffect(() => {
    if (ready && !submitted.current) saveDraft(draft);
  }, [draft, ready]);

  /* ---- browser Back / Forward between steps --------------------------------- */
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const raw = (e.state as { rqStep?: unknown } | null)?.rqStep;
      const target = (
        Number.isInteger(raw) && (raw as number) >= 1 && (raw as number) <= STEP_COUNT ? raw : 1
      ) as StepNumber;
      const allowed = furthestValidStep(target, draftRef.current);
      if (allowed !== target) window.history.replaceState({ rqStep: allowed }, "");
      if (allowed === stepRef.current) return;
      setDir(allowed > stepRef.current ? 1 : -1);
      focusHeading.current = true;
      setErrors({});
      setDraft((d) => ({ ...d, step: allowed }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---- navigation ------------------------------------------------------------ */
  const goTo = useCallback((n: StepNumber, prefill?: (d: Draft) => Draft) => {
    setDir(n > stepRef.current ? 1 : -1);
    setErrors({});
    setFailure(null);
    focusHeading.current = true;
    setDraft((d) => ({ ...(prefill ? prefill(d) : d), step: n }));
    window.history.pushState({ rqStep: n }, "");
  }, []);

  /** After a step change: focus the new heading and bring the form into view if it scrolled away. */
  const onBodyStart = useCallback(
    (definition: unknown) => {
      if (definition !== "show" || !focusHeading.current) return;
      focusHeading.current = false;
      headingRef.current?.focus({ preventScroll: true });
      const top = formRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) {
        window.scrollTo({
          top: window.scrollY + top - 16,
          behavior: reduce ? "auto" : "smooth",
        });
      }
    },
    [reduce],
  );

  /* ---- editing --------------------------------------------------------------- */
  const revalidate = (d: Draft, key: FieldKey) => {
    const msg = validateStep(step, d, localIsoDate())[key];
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });
  };

  const onText = (key: TextKey, value: string) => {
    const next = writeText(draft, key, value);
    setDraft(next);
    if (errors[key as FieldKey]) revalidate(next, key as FieldKey);
  };

  const onBlurText = (key: TextKey) => {
    const hasValue = readText(draft, key).trim() !== "";
    if (attempted[step] || hasValue) revalidate(draft, key as FieldKey);
  };

  const onToggleNeed = (id: NeedId) => {
    const next = { ...draft, needs: toggleNeed(draft.needs, id) };
    setDraft(next);
    if (errors.needs && next.needs.length > 0) {
      setErrors((e) => {
        const rest = { ...e };
        delete rest.needs;
        return rest;
      });
    }
  };

  const tf: FieldProps = (key) => ({
    value: readText(draft, key),
    onChange: (v) => onText(key, v),
    onBlur: () => onBlurText(key),
    error: errors[key as FieldKey] ?? null,
    shakeKey: shake[key as FieldKey] ?? 0,
    inputRef: register(key as FieldKey),
  });

  /* ---- submit ----------------------------------------------------------------- */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const errs = validateStep(step, draft, localIsoDate());
    setErrors(errs);
    setAttempted((a) => ({ ...a, [step]: true }));
    const bad = Object.keys(errs) as FieldKey[];
    if (bad.length > 0) {
      setShake((s) => {
        const out = { ...s };
        for (const k of bad) out[k] = (out[k] ?? 0) + 1;
        return out;
      });
      focusFirstInvalid(FIELD_ORDER[step], errs);
      return;
    }

    if (step < STEP_COUNT) {
      const to = (step + 1) as StepNumber;
      // Step 3 asks for a location again: start it from the business location.
      goTo(
        to,
        step === 2
          ? (d) =>
              d.needs.includes("recruitment") && !d.recruitment.location.trim()
                ? { ...d, recruitment: { ...d.recruitment, location: d.business.location } }
                : d
          : undefined,
      );
      return;
    }

    // Last step: make sure nothing earlier went stale, then send.
    const firstBad = furthestValidStep(STEP_COUNT as StepNumber, draft);
    if (firstBad < STEP_COUNT) {
      goTo(firstBad);
      return;
    }
    setPending(true);
    setFailure(null);
    const input = buildInput(draft);
    const res = await submitRequest(input);
    if (res.ok) {
      submitted.current = true;
      clearDraft();
      saveSent({
        needs: input.needs,
        headcount: input.recruitment?.headcount ?? null,
        location: input.recruitment?.location ?? input.business.location,
        reference: res.reference,
      });
      // Stay in the "Sending…" state while the next screen opens.
      router.push(REQUEST_ROUTES.sent);
      return;
    }
    setPending(false);
    setFailure(res.message || MESSAGES.failure);
  }

  /** Enter on a choice card continues (native Enter on a checkbox is inconsistent). */
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const t = e.target as HTMLElement;
    if (e.key === "Enter" && t instanceof HTMLInputElement && t.type === "checkbox") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  /* ---- render ------------------------------------------------------------------ */
  if (!ready) return <RequestFormSkeleton />;

  const summaries: { n: StepNumber; text: string }[] = [];
  if (step > 1) summaries.push({ n: 1, text: businessSummary(draft) });
  if (step > 2) {
    summaries.push({ n: 2, text: NEEDS.filter((n) => draft.needs.includes(n.id)).map((n) => n.title).join(" · ") });
  }
  if (step > 3) summaries.push({ n: 3, text: requirementSummary(draft) });
  const upcoming = STEPS.filter((s) => s.n > step && s.n > 1);

  const isLast = step === STEP_COUNT;

  return (
    <FormFrame as="form" formRef={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} ariaBusy={pending}>
      <StepIndicator step={step} animated />
      <MobileProgress step={step} animated />

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={bodyV}
          initial="hidden"
          animate="show"
          exit="exit"
          onAnimationStart={onBodyStart}
          className="flex flex-col gap-4 wf-d:gap-6"
        >
          {summaries.map((s) => (
            <Item key={s.n}>
              <SummaryCard
                title={STEPS[s.n - 1].title}
                text={s.text}
                onEdit={() => goTo(s.n)}
                animated
              />
            </Item>
          ))}

          <Item>
            {step === 1 && (
              <StepFieldset title={STEPS[0].title} headingRef={headingRef}>
                <BusinessFields tf={tf} />
              </StepFieldset>
            )}
            {step === 2 && (
              <NeedsFieldset
                selected={draft.needs}
                onToggle={onToggleNeed}
                register={register("needs")}
                error={errors.needs}
                headingRef={headingRef}
              />
            )}
            {step === 3 && (
              <StepFieldset title={STEPS[2].title} headingRef={headingRef}>
                <RequirementFields needs={draft.needs} tf={tf} today={localIsoDate()} />
              </StepFieldset>
            )}
            {step === 4 && (
              <StepFieldset title={STEPS[3].title} headingRef={headingRef}>
                <ContactFields tf={tf} />
              </StepFieldset>
            )}
          </Item>

          <Item className="mt-1 wf-d:mt-0">
            <FormAlert>{failure}</FormAlert>
            <div className={cn("flex flex-col wf-d:flex-row wf-d:items-center", failure && "mt-4")}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => goTo((step - 1) as StepNumber)}
                  className="rq-link hidden text-[15px] wf-d:inline-block"
                >
                  <T>{NAV_UI.back}</T>
                </button>
              )}
              <RqButton
                label={isLast ? NAV_UI.send : NAV_UI.next}
                pending={pending}
                className="w-full wf-d:ml-auto wf-d:w-auto"
              />
            </div>
          </Item>

          {upcoming.map((s) => (
            <Item key={s.n}>
              <UpcomingCard n={s.n} title={s.title} desktop={s.upcoming.desktop} mobile={s.upcoming.mobile} />
            </Item>
          ))}
        </motion.div>
      </AnimatePresence>

      <p className="ps-sm hidden !text-[13px] wf-d:block">
        {NAV_UI.privacyLead}{" "}
        <Link href={REQUEST_ROUTES.privacy}>{NAV_UI.privacyLink}</Link>
      </p>
    </FormFrame>
  );
}
