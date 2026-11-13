"use client";

/**
 * Presentational pieces of the Request Talent form (Request-*.dc.html):
 * step indicator (desktop bars / mobile progress line), completed-step summary
 * card, dashed "coming up" card, step-2 choice card, text fields and the pill
 * button. Text is wrapped in <T> so the same markup doubles as the loading
 * skeleton. Motion goes through components/public/motion.ts (shared easing);
 * only transform / opacity / clip-path / pathLength are animated.
 */

import { DatePicker } from "@/components/applicant/form-fields";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
import { useEffect, type ReactNode, type Ref } from "react";
import { motion, useAnimationControls } from "motion/react";
import { FieldError } from "@/components/public/auth/fields";
import { SpinnerIcon } from "@/components/public/auth/AuthIcons";
import { DUR, EASE, useMotionAllowed } from "@/components/public/motion";
import { T } from "@/components/public/primitives";
import { NAV_UI, STEPS, STEP_COUNT, SUMMARY_UI, type StepNumber } from "@/lib/public-site/request-content";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tick: the wireframe's check path, optionally drawn in.              */
/* ------------------------------------------------------------------ */

const TICK = "m5 12 5 5 9-10";

export function Tick({
  size,
  strokeWidth,
  stroke = "currentColor",
  show = true,
  animate = true,
  delay = 0,
  duration = DUR.fast,
  className,
}: {
  size: number;
  strokeWidth: number;
  stroke?: string;
  /** Drawn (true) or undrawn (false); animates between the two. */
  show?: boolean;
  /** false = no draw animation (skeleton, reduced motion): state is applied instantly. */
  animate?: boolean;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const allowed = useMotionAllowed();
  const move = animate && allowed;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d={TICK}
        initial={move && show ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: show ? 1 : 0, opacity: show ? 1 : 0 }}
        transition={move ? { duration, ease: EASE, delay } : { duration: 0 }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Step indicator                                                       */
/* ------------------------------------------------------------------ */

/** Desktop: four 3px bars, current step bold purple, done ink, upcoming muted. */
export function StepIndicator({ step, animated }: { step: StepNumber; animated: boolean }) {
  return (
    <ol
      aria-label="Progress"
      className="m-0 hidden list-none grid-cols-4 gap-2 p-0 wf-d:grid"
    >
      {STEPS.map((s, i) => {
        const state = s.n < step ? "done" : s.n === step ? "current" : "todo";
        return (
          <li
            key={s.n}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "relative pt-[10px] text-[13px] transition-[color,font-weight] duration-500",
              state === "done" && "font-medium text-(--ink)",
              state === "current" && "font-bold text-(--beeliv-purple)",
              state === "todo" && "font-medium text-(--muted-text)",
            )}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 block h-[3px] bg-(--soft-border)">
              <motion.span
                className="absolute inset-0 block origin-left bg-(--beeliv-purple)"
                initial={animated ? { scaleX: 0 } : false}
                animate={{ scaleX: state === "todo" ? 0 : 1 }}
                transition={{ duration: DUR.base, ease: EASE, delay: animated ? i * 0.08 : 0 }}
              />
            </span>
            <T>{`${s.n} · ${s.title}`}</T>
            {state === "done" && <span className="sr-only"> (completed)</span>}
            {state === "current" && <span className="sr-only"> (current step)</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Mobile: "Step 2 of 4 · What you need   50%" over a 4px bar. */
export function MobileProgress({ step, animated }: { step: StepNumber; animated: boolean }) {
  const pct = Math.round((step / STEP_COUNT) * 100);
  const title = STEPS[step - 1].title;
  return (
    <div className="flex flex-col gap-2 wf-d:hidden">
      <div className="flex justify-between text-[13px] font-bold">
        <span className="text-(--beeliv-purple)">
          <T>{`Step ${step} of ${STEP_COUNT} · ${title}`}</T>
        </span>
        <span className="text-(--muted-text)">
          <T>{`${pct}%`}</T>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Step ${step} of ${STEP_COUNT}`}
        className="h-1 rounded-[4px] bg-(--soft-border)"
      >
        <motion.div
          className="h-1 bg-(--beeliv-purple)"
          initial={animated ? { clipPath: "inset(0 100% 0 0 round 4px)" } : false}
          animate={{ clipPath: `inset(0 ${100 - pct}% 0 0 round 4px)` }}
          transition={{ duration: DUR.base, ease: EASE }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary card (completed step) and dashed card (coming up)            */
/* ------------------------------------------------------------------ */

export function SummaryCard({
  title,
  text,
  onEdit,
  animated,
}: {
  title: string;
  /** Empty = only the title is shown. */
  text: string;
  onEdit?: () => void;
  animated: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-(--soft-border) px-4 py-[14px] wf-d:px-5 wf-d:py-4">
      <span className="flex min-w-0 items-center gap-[10px] text-[15px]">
        <Tick size={16} strokeWidth={2.2} stroke="var(--beeliv-purple)" animate={animated} delay={0.2} className="shrink-0" />
        <span className="min-w-0">
          <b>
            <T>{title}</T>
          </b>
          {text && (
            <>
              {" "}
              <T>·</T>{" "}
              <span className="ps-sm break-words">
                <T>{text}</T>
              </span>
            </>
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={SUMMARY_UI.editLabel(title)}
        className="rq-link shrink-0 text-sm"
      >
        <T>{SUMMARY_UI.edit}</T>
      </button>
    </div>
  );
}

export function UpcomingCard({
  n,
  title,
  desktop,
  mobile,
}: {
  n: number;
  title: string;
  desktop: string;
  mobile: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-dashed border-(--soft-border) px-5 py-4">
      <span className="text-[15px] font-bold text-(--muted-text)">
        <T>{`${n} · ${title}`}</T>
      </span>
      <span className="ps-sm">
        <span className="hidden wf-d:inline">
          <T>{desktop}</T>
        </span>
        <span className="wf-d:hidden">
          <T>{mobile}</T>
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 choice card                                                   */
/* ------------------------------------------------------------------ */

export function NeedCard({
  id,
  title,
  sub,
  on,
  onToggle,
  inputRef,
  describedBy,
  className,
  animated = true,
  readOnly = false,
}: {
  id: string;
  title: string;
  sub: string;
  on: boolean;
  onToggle?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  describedBy?: string;
  className?: string;
  animated?: boolean;
  /** Skeleton: drawn only, not interactive. */
  readOnly?: boolean;
}) {
  return (
    <motion.label
      htmlFor={id}
      data-on={on}
      className={cn("rq-need", className)}
      whileTap={readOnly ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={on}
        onChange={onToggle}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        aria-describedby={describedBy}
      />
      <span className="rq-box" aria-hidden="true">
        <Tick size={20} strokeWidth={2.4} stroke="#fff" show={on} animate={animated} duration={0.35} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-bold">
          <T>{title}</T>
        </span>
        <span className="ps-sm">
          <T>{sub}</T>
        </span>
      </span>
    </motion.label>
  );
}

/* ------------------------------------------------------------------ */
/* Text field (`.fl` label + `.in` input)                               */
/* ------------------------------------------------------------------ */

export type RqFieldProps = {
  id: string;
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  /** Increment to shake the field (invalid submit). */
  shakeKey?: number;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  multiline?: boolean;
  type?: "text" | "email" | "tel" | "date";
  inputMode?: "text" | "numeric" | "email" | "tel";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  min?: string;
  className?: string;
};

export function RqField({
  id,
  label,
  optional,
  value,
  onChange,
  onBlur,
  error,
  shakeKey = 0,
  inputRef,
  multiline,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  min,
  className,
}: RqFieldProps) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (shakeKey > 0) {
      controls.start({
        x: [0, -6, 6, -4, 4, 0],
        transition: { duration: DUR.fast, ease: EASE },
      });
    }
  }, [shakeKey, controls]);

  const errId = `${id}-err`;
  const common = {
    id,
    className: "rq-in",
    value,
    placeholder: placeholder || undefined,
    maxLength,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
    onBlur,
  } as const;

  return (
    <motion.div animate={controls} className={cn("rq-f", className)}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="rq-opt"> · Optional</span>}
      </label>
      {multiline ? (
        <textarea
          {...common}
          ref={inputRef as Ref<HTMLTextAreaElement>}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : type === "tel" ? (
        <CountryPhoneInput
          variant="public"
          quiet
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          invalid={!!error}
          describedBy={error ? errId : undefined}
          inputRef={inputRef as Ref<HTMLInputElement>}
        />
      ) : type === "date" ? (
        <DatePicker
          id={id}
          value={value}
          onChange={onChange}
          min={min}
          title={label}
          placeholder="Select a date"
          invalid={!!error}
          describedBy={error ? errId : undefined}
        />
      ) : (
        <input
          {...common}
          ref={inputRef as Ref<HTMLInputElement>}
          type={type}
          inputMode={inputMode}
          min={min}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={type === "email" ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <FieldError id={errId}>{error}</FieldError>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Arrow label + primary button                                         */
/* ------------------------------------------------------------------ */

const arrowVariants = { rest: { x: 0 }, hover: { x: 4 } };

/** "Continue →": the arrow nudges on hover, like the marketing buttons. */
function Arrowed({ label }: { label: string }) {
  const m = label.match(/^(.*?)\s*→$/);
  if (!m) return <T>{label}</T>;
  return (
    <T>
      {m[1]}{" "}
      <motion.span
        variants={arrowVariants}
        transition={{ duration: 0.3, ease: EASE }}
        className="inline-block"
      >
        →
      </motion.span>
    </T>
  );
}

export function RqButton({
  label,
  pending = false,
  pendingLabel = NAV_UI.sending,
  className,
}: {
  label: string;
  pending?: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <motion.button
      type="submit"
      className={cn("ps-btn ps-bp ps-btn-hero rq-go", className)}
      aria-disabled={pending}
      aria-busy={pending}
      initial="rest"
      whileHover={pending ? undefined : "hover"}
      whileTap={pending ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <span className="flex-1">{pending ? pendingLabel : <Arrowed label={label.replace(/\s*→$/, "")} />}</span>
      <span className="ps-btn-disc" aria-hidden="true">
        {pending ? (
          <SpinnerIcon />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}

/** "What happens next" list, shared by the desktop aside and the mobile section. */
export function NextList({
  steps,
  numeralClass,
}: {
  steps: readonly { num: string; title: string; text: string }[];
  numeralClass: string;
}): ReactNode {
  return (
    <ol className="m-0 flex list-none flex-col gap-[18px] p-0">
      {steps.map((s) => (
        <li key={s.num} className="flex items-start gap-4">
          <span className={cn("ps-serif leading-none text-(--deep-gold)", numeralClass)}>
            <T>{s.num}</T>
          </span>
          <span className="flex flex-col gap-1">
            <b className="text-base">
              <T>{s.title}</T>
            </b>
            <span className="ps-sm">
              <T>{s.text}</T>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
