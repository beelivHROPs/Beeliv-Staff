"use client";

/**
 * The field groups for each step of the Request Talent form, plus the
 * stagger-in wrapper. Step 2 (the five choice cards) is the only step the
 * wireframe draws in full; steps 1, 3 and 4 use the wireframe's own field
 * styling (`.fl` label / `.in` input) with the field lists it gives.
 */

import { useState, type ReactNode, type Ref } from "react";
import { motion, type Variants } from "motion/react";
import { FieldError } from "@/components/public/auth/fields";
import { DUR, EASE } from "@/components/public/motion";
import { T } from "@/components/public/primitives";
import { FIELDS, NEEDS, NEEDS_UI, TRAINING_TOPIC_OPTIONS } from "@/lib/public-site/request-content";
import { CONTACT_FIELDS } from "@/lib/public-site/contact-content";
import { LocationPicker } from "@/components/shared/LocationPicker";
import { MultiPicker } from "@/components/shared/MultiPicker";
import { NumberStepper } from "@/components/shared/NumberStepper";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { DETAIL_NEEDS } from "@/lib/public-site/request-rules";
import type { NeedId } from "@/lib/public-site/request";
import { cn } from "@/lib/utils";
import { NeedCard, RqField, type RqFieldProps } from "./parts";

/* ------------------------------ stagger wrapper ---------------------------- */

const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  // `i` > 0: a nested item (a field row inside the step's fieldset). It waits for
  // the fieldset to fade in, then rises in 70ms steps. i = 0: a direct child of the
  // step body, staggered by the body's own `staggerChildren`.
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.fast, ease: EASE, delay: i ? 0.15 + i * 0.07 : 0 },
  }),
};

/** Fades/rises in as part of the step body's stagger. */
export function Item({
  className,
  i = 0,
  children,
}: {
  className?: string;
  i?: number;
  children: ReactNode;
}) {
  return (
    <motion.div variants={itemV} custom={i} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------ text-field props --------------------------- */

export type TextKey =
  | "business.name"
  | "business.outlet"
  | "business.location"
  | "recruitment.roles"
  | "recruitment.headcount"
  | "recruitment.location"
  | "recruitment.startDate"
  | "training.teamSize"
  | "training.topics"
  | "details"
  | "contact.name"
  | "contact.jobTitle"
  | "contact.email"
  | "contact.phone"
  | "contact.bestTime";

/** Returns the value/handlers/error/ref props for a field (supplied by the wizard). */
export type FieldProps = (
  key: TextKey,
) => Pick<
  RqFieldProps,
  "value" | "onChange" | "onBlur" | "error" | "shakeKey" | "inputRef"
>;

/* --------------------------------- heading --------------------------------- */

/** Fieldset + legend heading (serif 35 desktop / 30 mobile), the wireframe's structure. */
export function StepFieldset({
  title,
  hint,
  headingRef,
  children,
}: {
  title: string;
  hint?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0 wf-d:gap-[18px]">
      <legend className={cn("p-0", hint ? "mb-2 wf-d:mb-[6px]" : "mb-[14px] wf-d:mb-[14px]")}>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="ps-serif block outline-none [--fs-d:35] [--fs-m:30]"
        >
          <T>{title}</T>
        </h2>
        {hint && (
          <span className="ps-sm">
            <T>{hint}</T>
          </span>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

/** Location = State -> LGA -> nearest junction (see components/shared/LocationPicker.tsx). */
function LocationField({ tf, k, id }: { tf: FieldProps; k: TextKey; id: string }) {
  const p = tf(k);
  return <LocationPicker idPrefix={id} value={p.value} onChange={p.onChange} error={p.error} />;
}

/** A labelled "pick from the list or write your own" field that stores a comma-separated string. */
function PickerField({
  tf,
  k,
  id,
  label,
  placeholder,
  options,
}: {
  tf: FieldProps;
  k: TextKey;
  id: string;
  label: string;
  placeholder: string;
  options: readonly string[];
}) {
  const p = tf(k);
  return (
    <div className="rq-f">
      <label htmlFor={id}>{label}</label>
      <MultiPicker id={id} value={p.value} onChange={p.onChange} options={options} placeholder={placeholder} error={p.error} />
    </div>
  );
}

/** Whole-number field with − / + buttons. */
function NumberField({ tf, k, id, label, placeholder }: { tf: FieldProps; k: TextKey; id: string; label: string; placeholder?: string }) {
  const p = tf(k);
  return (
    <div className="rq-f">
      <label htmlFor={id}>{label}</label>
      <NumberStepper id={id} value={p.value} onChange={p.onChange} placeholder={placeholder} error={p.error} />
    </div>
  );
}

const BEST_TIMES = [
  "Weekday mornings (8am - 12pm)",
  "Weekday afternoons (12pm - 4pm)",
  "Weekday evenings (4pm - 7pm)",
  "Weekends",
  "Any time",
] as const;

/** Best time to call: pick a window, or choose Other and write your own. */
function BestTimeField({ tf, id, label, optional }: { tf: FieldProps; id: string; label: string; optional?: boolean }) {
  const p = tf("contact.bestTime");
  const custom = p.value !== "" && !(BEST_TIMES as readonly string[]).includes(p.value);
  const [other, setOther] = useState(custom);
  return (
    <div className="rq-f">
      <label htmlFor={id}>
        {label}
        {optional && <span className="rq-opt"> · Optional</span>}
      </label>
      <SelectMenu
        id={id}
        value={other ? "Other" : p.value}
        placeholder="Select a time"
        options={[...BEST_TIMES, "Other"]}
        onChange={(v) => {
          if (v === "Other") {
            setOther(true);
            p.onChange("");
          } else {
            setOther(false);
            p.onChange(v);
          }
        }}
      />
      {other && (
        <input
          className="ap-input"
          aria-label="Best time to call (other)"
          placeholder="e.g. Weekdays after 2pm"
          value={p.value}
          maxLength={120}
          onChange={(e) => p.onChange(e.target.value)}
        />
      )}
    </div>
  );
}

const GRID = "grid grid-cols-1 gap-4 wf-d:grid-cols-2 wf-d:gap-[18px]";

/* ---------------------------------- step 1 --------------------------------- */

export function BusinessFields({ tf }: { tf: FieldProps }) {
  const f = FIELDS.business;
  return (
    <div className={GRID}>
      <Item i={1} className="wf-d:col-span-2">
        <RqField
          {...tf("business.name")}
          id="rq-biz-name"
          label={f.name.label}
          autoComplete="organization"
          maxLength={200}
        />
      </Item>
      <Item i={2} className="wf-d:col-span-2">
        <RqField
          {...tf("business.outlet")}
          id="rq-biz-outlet"
          label={f.outlet.label}
          optional
          placeholder={f.outlet.placeholder}
          maxLength={200}
        />
      </Item>
      <Item i={3} className="wf-d:col-span-2">
        <LocationField tf={tf} k="business.location" id="rq-biz-location" />
      </Item>
    </div>
  );
}

/* ---------------------------------- step 2 --------------------------------- */

export function NeedsFieldset({
  selected,
  onToggle,
  register,
  error,
  headingRef,
  animated = true,
  readOnly = false,
}: {
  selected: readonly NeedId[];
  onToggle?: (id: NeedId) => void;
  register?: (el: HTMLInputElement | null) => void;
  error?: string | null;
  headingRef?: Ref<HTMLHeadingElement>;
  animated?: boolean;
  readOnly?: boolean;
}) {
  return (
    <StepFieldset title={NEEDS_UI.legend} hint={NEEDS_UI.hint} headingRef={headingRef}>
      <div className="grid grid-cols-1 gap-3 wf-d:grid-cols-2">
        {NEEDS.map((n, i) => (
          <NeedCard
            key={n.id}
            id={`rq-need-${n.id}`}
            title={n.title}
            sub={n.sub}
            on={selected.includes(n.id)}
            onToggle={onToggle ? () => onToggle(n.id) : undefined}
            inputRef={i === 0 ? register : undefined}
            describedBy={error ? "rq-needs-err" : undefined}
            className={n.id === "unsure" ? "wf-d:col-span-2" : undefined}
            animated={animated}
            readOnly={readOnly}
          />
        ))}
      </div>
      <FieldError id="rq-needs-err">{error}</FieldError>
    </StepFieldset>
  );
}

/* ---------------------------------- step 3 --------------------------------- */

function SubSection({
  title,
  sub,
  i,
  first,
  showHeading,
  children,
}: {
  title: string;
  sub?: string;
  i: number;
  first: boolean;
  showHeading: boolean;
  children: ReactNode;
}) {
  return (
    <Item
      i={i}
      className={cn(
        "flex flex-col gap-4 wf-d:gap-[18px]",
        !first && "border-t border-(--soft-border) pt-5 wf-d:pt-6",
      )}
    >
      {showHeading && (
        <div className="flex flex-col gap-0.5">
          <h3 className="m-0 text-base font-bold">
            <T>{title}</T>
          </h3>
          {sub && (
            <p className="ps-sm">
              <T>{sub}</T>
            </p>
          )}
        </div>
      )}
      {children}
    </Item>
  );
}

export function RequirementFields({
  needs,
  tf,
  today,
}: {
  needs: readonly NeedId[];
  tf: FieldProps;
  today: string;
}) {
  const rec = needs.includes("recruitment");
  const trn = needs.includes("training");
  const detailNeeds = NEEDS.filter((n) => DETAIL_NEEDS.includes(n.id) && needs.includes(n.id));
  const sections = Number(rec) + Number(trn) + Number(detailNeeds.length > 0);
  const multi = sections > 1;
  const r = FIELDS.recruitment;
  const t = FIELDS.training;

  return (
    <div className="flex flex-col gap-5 wf-d:gap-6">
      {rec && (
        <SubSection
          title={NEEDS[0].title}
          sub={NEEDS[0].sub}
          i={1}
          first

          showHeading={multi}
        >
          <div className={GRID}>
            <div className="wf-d:col-span-2">
              <PickerField tf={tf} k="recruitment.roles" id="rq-rec-roles" label={r.roles.label} placeholder="Add a role" options={CONTACT_FIELDS.roleOptions} />
            </div>
            <NumberField tf={tf} k="recruitment.headcount" id="rq-rec-headcount" label={r.headcount.label} placeholder={r.headcount.placeholder} />
            <div className="wf-d:col-span-2">
              <LocationField tf={tf} k="recruitment.location" id="rq-rec-location" />
            </div>
            <RqField
              {...tf("recruitment.startDate")}
              id="rq-rec-start"
              label={r.startDate.label}
              optional
              type="date"
              min={today}
            />
          </div>
        </SubSection>
      )}

      {trn && (
        <SubSection
          title={NEEDS[1].title}
          sub={NEEDS[1].sub}
          i={rec ? 2 : 1}
          first={!rec}
          showHeading={multi}
        >
          <div className={GRID}>
            <NumberField tf={tf} k="training.teamSize" id="rq-trn-size" label={t.teamSize.label} placeholder={t.teamSize.placeholder} />
            <div className="wf-d:col-span-2">
              <PickerField tf={tf} k="training.topics" id="rq-trn-topics" label={t.topics.label} placeholder="Add a training topic" options={TRAINING_TOPIC_OPTIONS} />
            </div>
          </div>
        </SubSection>
      )}

      {detailNeeds.length > 0 && (
        <SubSection
          title={detailNeeds.map((n) => n.title).join(" · ")}
          i={Number(rec) + Number(trn) + 1}
          first={!rec && !trn}
          showHeading={multi}
        >
          <RqField
            {...tf("details")}
            id="rq-details"
            label={FIELDS.details.label}
            optional
            multiline
            maxLength={2000}
          />
        </SubSection>
      )}
    </div>
  );
}

/* ---------------------------------- step 4 --------------------------------- */

export function ContactFields({ tf }: { tf: FieldProps }) {
  const c = FIELDS.contact;
  return (
    <div className={GRID}>
      <Item i={1}>
        <RqField
          {...tf("contact.name")}
          id="rq-c-name"
          label={c.name.label}
          autoComplete="name"
          maxLength={200}
        />
      </Item>
      <Item i={2}>
        <RqField
          {...tf("contact.jobTitle")}
          id="rq-c-title"
          label={c.jobTitle.label}
          optional
          placeholder={c.jobTitle.placeholder}
          autoComplete="organization-title"
          maxLength={200}
        />
      </Item>
      <Item i={3}>
        <RqField
          {...tf("contact.email")}
          id="rq-c-email"
          label={c.email.label}
          type="email"
          inputMode="email"
          placeholder={c.email.placeholder}
          autoComplete="email"
          maxLength={254}
        />
      </Item>
      <Item i={4}>
        <RqField
          {...tf("contact.phone")}
          id="rq-c-phone"
          label={c.phone.label}
          type="tel"
          inputMode="tel"
          placeholder={c.phone.placeholder}
          autoComplete="tel"
          maxLength={40}
        />
      </Item>
      <Item i={5} className="wf-d:col-span-2">
        <BestTimeField tf={tf} id="rq-c-time" label={c.bestTime.label} optional />
      </Item>
    </div>
  );
}
