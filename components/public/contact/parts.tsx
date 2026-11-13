"use client";

/**
 * Presentational pieces of the Contact form (Contact-*.dc.html): the "I'm..."
 * selector card (native radio, unlike Request's drawn checkbox - the wireframe
 * itself draws a plain `<input type="radio">`) and the text field. Classes are
 * `.cf-*` (app/(public)/contact/contact.css). Text is wrapped in <T> so the
 * same markup doubles as the loading skeleton.
 */

import { useEffect, type Ref } from "react";
import { motion, useAnimationControls } from "motion/react";
import { FieldError } from "@/components/public/auth/fields";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
import { SpinnerIcon } from "@/components/public/auth/AuthIcons";
import { DUR, EASE } from "@/components/public/motion";
import { T } from "@/components/public/primitives";
import { CONTACT_NAV_UI, type ContactKind } from "@/lib/public-site/contact-content";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* "I'm..." selector card                                              */
/* ------------------------------------------------------------------ */

export function KindCard({
  id,
  name,
  value,
  label,
  checked,
  onSelect,
  readOnly = false,
}: {
  id: string;
  name: string;
  value: ContactKind;
  label: string;
  checked: boolean;
  onSelect?: () => void;
  readOnly?: boolean;
}) {
  return (
    <label htmlFor={id} data-on={checked} className="cf-kind">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={readOnly ? undefined : onSelect}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
      />
      <span className="ps-serif [--fs-d:26] [--fs-m:23]">
        <T>{label}</T>
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Text field (`.fl` label + `.in` input)                               */
/* ------------------------------------------------------------------ */

export type CfFieldProps = {
  id: string;
  label: string;
  note?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  /** Increment to shake the field (invalid submit). */
  shakeKey?: number;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  multiline?: boolean;
  type?: "text" | "email" | "tel" | "file";
  inputMode?: "text" | "email" | "tel";
  autoComplete?: string;
  placeholder?: string;
  accept?: string;
  maxLength?: number;
  className?: string;
};

export function CfField({
  id,
  label,
  note,
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
  accept,
  maxLength,
  className,
}: CfFieldProps) {
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
  const isFile = type === "file";
  const common = {
    id,
    className: "cf-in",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : undefined,
    onBlur,
  } as const;

  return (
    <motion.div animate={controls} className={cn("cf-f", className)}>
      <label htmlFor={id}>
        <T>{label}</T>
        {note && <span className="cf-note"> {note}</span>}
      </label>
      {multiline ? (
        <textarea
          {...common}
          ref={inputRef as Ref<HTMLTextAreaElement>}
          value={value}
          placeholder={placeholder || undefined}
          maxLength={maxLength}
          rows={5}
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
      ) : isFile ? (
        <input
          {...common}
          ref={inputRef as Ref<HTMLInputElement>}
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
        />
      ) : (
        <input
          {...common}
          ref={inputRef as Ref<HTMLInputElement>}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder || undefined}
          maxLength={maxLength}
          autoComplete={autoComplete}
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
/* Submit button ("Send Message →")                                    */
/* ------------------------------------------------------------------ */

const arrowVariants = { rest: { x: 0 }, hover: { x: 4 } };

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

export function CfSubmitButton({ pending, className }: { pending: boolean; className?: string }) {
  return (
    <motion.button
      type="submit"
      className={cn("ps-btn ps-bp ps-btn-hero cf-go", className)}
      aria-disabled={pending}
      aria-busy={pending}
      initial="rest"
      whileHover={pending ? undefined : "hover"}
      whileTap={pending ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <span className="flex-1">{pending ? CONTACT_NAV_UI.sending : <Arrowed label={CONTACT_NAV_UI.send.replace(/\s*→$/, "")} />}</span>
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
