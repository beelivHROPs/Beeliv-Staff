"use client";

/**
 * Form building blocks shared by the four auth screens. Markup follows the
 * wireframe's `.au-*` structure (label, icon-in-input, hint, pill button) with
 * the accessibility the wireframe's static HTML does not show: real <label for>,
 * aria-invalid + aria-describedby on errors, aria-live on status, and a focus
 * helper so a failed submit lands on the first invalid field.
 *
 * Motion (shared easing from components/public/motion.ts): field shake on an
 * invalid submit, error fade-in, sliding switch pill, button press, arrow nudge,
 * strength meter fill. Only transform / opacity are animated.
 */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { motion, useAnimationControls } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE, DUR } from "@/components/public/motion";
import { T } from "@/components/public/primitives";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
import { AUTH_BACKEND_CONNECTED } from "@/lib/public-site/auth";
import { AUTH_MESSAGES } from "@/lib/public-site/auth-content";
import type { StrengthScore } from "@/lib/public-site/auth-rules";
import {
  AlertIcon,
  CheckIcon,
  EyeIcon,
  LockIcon,
  SpinnerIcon,
} from "./AuthIcons";

/* ------------------------------------------------------------------ */
/* Focus helper: focus the first invalid field after a failed submit.   */
/* ------------------------------------------------------------------ */

export function useFieldRefs<K extends string>() {
  const refs = useRef<Partial<Record<K, HTMLElement | null>>>({});
  const register = useCallback(
    (name: K) => (el: HTMLElement | null) => {
      refs.current[name] = el;
    },
    [],
  );
  const focusFirstInvalid = useCallback(
    (order: readonly K[], errors: Partial<Record<K, string | null>>) => {
      const first = order.find((k) => errors[k]);
      if (first) refs.current[first]?.focus();
      return first;
    },
    [],
  );
  return { register, focusFirstInvalid };
}

/* ------------------------------------------------------------------ */
/* Messages                                                             */
/* ------------------------------------------------------------------ */

export function FieldError({ id, children }: { id: string; children?: string | null }) {
  if (!children) return null;
  return (
    <motion.p
      id={id}
      className="au-err"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast, ease: EASE }}
    >
      <AlertIcon />
      <span>{children}</span>
    </motion.p>
  );
}

/** Failure banner (role="alert"): what the backend, not the field rules, said. */
export function FormAlert({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <motion.div
      role="alert"
      className="au-alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast, ease: EASE }}
    >
      <AlertIcon size={16} />
      <span>{children}</span>
    </motion.div>
  );
}

/** Flow-test notices ("Backend not connected yet...") are hidden from users. Set true only to debug. */
const SHOW_FLOW_NOTICE = false;

/**
 * Temporary, clearly-labelled note shown while no auth backend is connected.
 * Renders nothing once AUTH_BACKEND_CONNECTED (lib/public-site/auth.ts) is true.
 */
export function FlowNotice({ children }: { children?: string | null }) {
  if (!SHOW_FLOW_NOTICE || AUTH_BACKEND_CONNECTED || !children) return null;
  return (
    <motion.p
      role="status"
      className="au-flow"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast, ease: EASE }}
    >
      {children}
    </motion.p>
  );
}

/* ------------------------------------------------------------------ */
/* Text field with a leading icon                                       */
/* ------------------------------------------------------------------ */

type AuthFieldProps = Omit<ComponentPropsWithRef<"input">, "id" | "children"> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string | null;
  /** Rendered inside the label column under the input (wireframe `.au-hint`). */
  hint?: ReactNode;
  hintClassName?: string;
  /** Extra element inside the input frame (the eye button). */
  trailing?: ReactNode;
  /** Increment to shake the field (invalid submit). 0 = never. */
  shakeKey?: number;
};

export function AuthField({
  id,
  label,
  icon,
  error,
  hint,
  hintClassName,
  trailing,
  shakeKey = 0,
  className,
  ...input
}: AuthFieldProps) {
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
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <motion.div animate={controls} className="au-f">
      <label htmlFor={id}>
        <T>{label}</T>
      </label>
      <span className="au-in">
        <span className="au-ico">{icon}</span>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={className}
          {...input}
        />
        {trailing}
      </span>
      {hint && (
        <div id={hintId} className={cn("au-hint", hintClassName)}>
          {hint}
        </div>
      )}
      <FieldError id={errId}>{error}</FieldError>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone field: country-code dropdown + number (components/shared)      */
/* ------------------------------------------------------------------ */

/** Same label / shake / error structure as AuthField, with the shared country-code phone input inside. */
export function AuthPhoneField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  shakeKey = 0,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  error?: string | null;
  shakeKey?: number;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (shakeKey > 0) {
      controls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: DUR.fast, ease: EASE } });
    }
  }, [shakeKey, controls]);
  const errId = `${id}-err`;
  return (
    <motion.div animate={controls} className="au-f">
      <label htmlFor={id}>
        <T>{label}</T>
      </label>
      <CountryPhoneInput variant="public" size="lg" quiet id={id} value={value} onChange={onChange} onBlur={() => onBlur?.(value)} invalid={!!error} describedBy={error ? errId : undefined} inputRef={inputRef} />
      <FieldError id={errId}>{error}</FieldError>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Password field: lock icon + show/hide eye (+ optional hint/strength) */
/* ------------------------------------------------------------------ */

export function PasswordField({
  id,
  ...rest
}: Omit<AuthFieldProps, "icon" | "trailing" | "type">) {
  const [show, setShow] = useState(false);
  return (
    <AuthField
      id={id}
      {...rest}
      type={show ? "text" : "password"}
      icon={<LockIcon />}
      className="au-pw"
      trailing={
        <button
          type="button"
          className="au-eye"
          aria-label={show ? AUTH_MESSAGES.hidePassword : AUTH_MESSAGES.showPassword}
          aria-controls={id}
          // Keep the caret in the input (and the mobile keyboard open) on tap.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShow((s) => !s)}
        >
          <EyeIcon off={show} />
        </button>
      }
    />
  );
}

/**
 * The signup password hint row: the wireframe's hint sentence, plus a small
 * three-step meter at the end of the same line (no extra height). The sentence
 * turns purple with a tick once the rule is met.
 */
export function PasswordHint({
  text,
  score,
}: {
  text: string;
  score: StrengthScore;
}) {
  const met = score >= 2;
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors duration-300",
          met && "text-(--beeliv-purple)",
        )}
      >
        {met && (
          <motion.span
            className="inline-flex"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <CheckIcon size={13} />
          </motion.span>
        )}
        <T>{text}</T>
      </span>
      <motion.span
        aria-live="polite"
        className="flex shrink-0 items-center gap-2"
        initial={false}
        animate={{ opacity: score > 0 ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <span className="text-[11.5px] font-medium">
          {AUTH_MESSAGES.strength[score] && (
            <span className="sr-only">Password strength: </span>
          )}
          {AUTH_MESSAGES.strength[score]}
        </span>
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="relative h-[3px] w-[18px] overflow-hidden rounded-full bg-(--soft-border)"
            >
              <motion.span
                className={cn(
                  "absolute inset-0 origin-left rounded-full",
                  score === 1
                    ? "bg-(--au-error)"
                    : score === 2
                      ? "bg-(--beeliv-purple)"
                      : "bg-(--beeliv-bright-purple)",
                )}
                initial={false}
                animate={{ scaleX: score >= n ? 1 : 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: score >= n ? (n - 1) * 0.06 : 0 }}
              />
            </span>
          ))}
        </span>
      </motion.span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Checkbox rows (Remember me / Terms consent)                          */
/* ------------------------------------------------------------------ */

export function CheckField({
  id,
  checked,
  onChange,
  children,
  error,
  top = false,
  shakeKey = 0,
  ref,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string | null;
  /** Consent row: label text may wrap, so align the box to the first line. */
  top?: boolean;
  shakeKey?: number;
  ref?: (el: HTMLInputElement | null) => void;
}) {
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
  return (
    <motion.div animate={controls} className="flex flex-col gap-[7px]">
      <label
        className="au-chk"
        htmlFor={id}
        style={top ? { alignItems: "flex-start" } : undefined}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          style={top ? { marginTop: 1 } : undefined}
        />
        <span>
          <T>{children}</T>
        </span>
      </label>
      <FieldError id={errId}>{error}</FieldError>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Find work / Hire talent switch (segmented radio group)               */
/* ------------------------------------------------------------------ */

export function SegmentedSwitch<V extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: V;
  onChange: (value: V) => void;
  options: readonly { value: V; label: string }[];
}) {
  const pillId = useId();
  return (
    <fieldset className="au-seg">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label key={o.value} className={cn(on && "on")}>
            <input
              type="radio"
              // Stops the browser restoring a stale radio after Back.
              autoComplete="off"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
            />
            {on && (
              <motion.span
                layoutId={`seg-${pillId}`}
                className="au-seg-pill"
                transition={{ duration: DUR.fast, ease: EASE }}
              />
            )}
            <span className="relative">
              <T>{o.label}</T>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                              */
/* ------------------------------------------------------------------ */

const arrowVariants = { rest: { x: 0 }, hover: { x: 4 } };

/** "Log in →": the arrow nudges on hover, like the marketing buttons. */
function ArrowLabel({ label }: { label: string }) {
  const m = label.match(/^(.*?)\s*→$/);
  if (!m) return <T>{label}</T>;
  return (
    <>
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
    </>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  pending,
  blocked = false,
  icon,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  /** Not allowed to submit right now (e.g. rate limited). The form's onSubmit must also refuse. */
  blocked?: boolean;
  /** Optional icon for the round disc on the left (hero pill: icon disc + label + arrow disc). */
  icon?: ReactNode;
}) {
  return (
    <motion.button
      type="submit"
      className={cn("au-btn au-btn-hero", icon ? "au-has-icon" : "")}
      data-blocked={blocked || undefined}
      aria-disabled={pending || blocked}
      aria-busy={pending}
      initial="rest"
      whileHover={pending || blocked ? undefined : "hover"}
      whileTap={pending || blocked ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {pending || icon ? <span className="au-disc" aria-hidden="true">{pending ? <SpinnerIcon /> : icon}</span> : null}
      <span className="au-btn-label">{pending ? pendingLabel : <T>{label.replace(/\s*→$/, "")}</T>}</span>
      <span className="au-disc" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

/** Text link with a trailing arrow that nudges on hover ("Request talent →"). */
export function ArrowLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <MotionLink
      href={href}
      className={className}
      initial="rest"
      whileHover="hover"
    >
      <ArrowLabel label={label} />
    </MotionLink>
  );
}

/** Full-width pill link that looks like SubmitButton ("Back to log in", "Request talent →"). */
export function PillLink({ href, label }: { href: string; label: string }) {
  return (
    <MotionLink
      href={href}
      className="au-btn"
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <ArrowLabel label={label} />
    </MotionLink>
  );
}
