"use client";

/**
 * Everything the applicant answered, read-only, grouped like the Applicant
 * app's application steps. Used by the Application tab (all sections except
 * screening) and the Screening tab (screening only), and as the compact
 * summary in Shortlisting. Has a search-within-answers box and Expand all /
 * Collapse all. Restricted values are never rendered (the adapter decides);
 * identity numbers arrive already masked.
 * Reused: Chip, CARD / sectionTitleClass, SearchField (Client), icons.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, LockKeyhole } from "@/components/applicant/icons";
import { Chip } from "@/components/applicant/primitives";
import { CARD, sectionTitleClass } from "@/components/applicant/SectionCard";
import { SearchField } from "@/components/client/records-filters";
import { formatDateTime, formatDateTimeFull } from "@/lib/admin/sort";
import type { ApplicationSubmission, SubmissionField, SubmissionSection, SubmissionSectionKind } from "@/lib/admin/applicants/types";

const matches = (f: SubmissionField, needle: string) => [f.label, f.value ?? "", ...(f.items ?? []), f.note ?? "", f.acceptedVersion ?? ""].some((s) => s.toLowerCase().includes(needle));
const answered = (f: SubmissionField) => f.value !== null && !f.restricted;

function FieldValue({ f }: { f: SubmissionField }) {
  if (f.restricted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-(--ap-muted)">
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" /> Not shown for your access level
      </span>
    );
  }
  if (f.value === null) return <span className="text-(--ap-muted)">Not answered</span>;
  if (f.items && f.items.length > 0) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {f.items.map((s) => (
          <Chip key={s} tone="violet">
            {s}
          </Chip>
        ))}
      </span>
    );
  }
  if (f.masked) {
    return (
      <span className="font-mono tracking-wider" aria-label={`${f.label} masked, last digits only`}>
        {f.value}
      </span>
    );
  }
  return <>{f.value}</>;
}

function Field({ f }: { f: SubmissionField }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">{f.label}</dt>
      <dd className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink)">
        <FieldValue f={f} />
        {f.acceptedAt ? (
          <span className="mt-0.5 block text-[13px] text-(--ap-muted)">
            Accepted {f.acceptedVersion ? `version ${f.acceptedVersion}, ` : ""}
            {formatDateTimeFull(f.acceptedAt)}
          </span>
        ) : null}
        {f.note ? <span className="mt-0.5 block text-[13px] text-(--ap-muted)">{f.note}</span> : null}
      </dd>
    </div>
  );
}

export function AnswersView({ submission, kinds, title, compact = false, empty }: { submission: ApplicationSubmission; kinds: SubmissionSectionKind[]; title: string; compact?: boolean; empty?: ReactNode }) {
  const base = useId();
  const sections = useMemo(() => submission.sections.filter((s) => kinds.includes(s.kind)), [submission, kinds]);
  const [query, setQuery] = useState("");
  // Closed section ids: everything starts open.
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const needle = query.trim().toLowerCase();

  const view: { s: SubmissionSection; fields: SubmissionField[] }[] = sections
    .map((s) => ({ s, fields: needle ? s.fields.filter((f) => matches(f, needle)) : s.fields }))
    .filter((x) => !needle || x.fields.length > 0);
  const hits = needle ? view.reduce((n, x) => n + x.fields.length, 0) : 0;
  const total = sections.reduce((n, s) => n + s.fields.length, 0);
  const done = sections.reduce((n, s) => n + s.fields.filter(answered).length, 0);
  const allOpen = closed.size === 0;

  const toggle = (id: string) =>
    setClosed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section className="@container flex flex-col gap-4" aria-label={title}>
      <div className={`${CARD} min-w-0`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={sectionTitleClass(true)}>{title}</h2>
            <p className="mt-1 text-[14px] text-(--ap-muted)">
              Submitted {formatDateTimeFull(submission.submittedAt)} · {done} of {total} answered · Read-only
            </p>
          </div>
          {!compact ? (
            <div className="flex gap-2">
              <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={() => setClosed(new Set())} disabled={allOpen}>
                Expand all
              </button>
              <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={() => setClosed(new Set(sections.map((s) => s.id)))} disabled={closed.size === sections.length}>
                Collapse all
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-3 min-[768px]:max-w-[420px]">
          <SearchField value={query} onChange={setQuery} label="Search within answers" placeholder="Search within answers" />
        </div>
        {needle ? (
          <p className="mt-2 text-[13px] text-(--ap-muted)" role="status">
            {hits} match{hits === 1 ? "" : "es"} for &ldquo;{query.trim()}&rdquo;
          </p>
        ) : null}
      </div>

      {view.length === 0 ? (
        needle ? (
          <div className={`${CARD} text-[14px] text-(--ap-muted)`}>No answers match your search.</div>
        ) : (
          (empty ?? <div className={`${CARD} text-[14px] text-(--ap-muted)`}>No answers to show.</div>)
        )
      ) : (
        view.map(({ s, fields }) => {
          const open = needle ? true : !closed.has(s.id);
          const panelId = `${base}-${s.id}`;
          return (
            <section key={s.id} className={`${CARD} min-w-0`} aria-label={s.title}>
              <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => !needle && toggle(s.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <span className="min-w-0">
                  <span className={`${sectionTitleClass(true)} block`}>{s.title}</span>
                  <span className="mt-0.5 block text-[13px] text-(--ap-muted)">
                    {s.lastEditedAt ? `Last edited ${formatDateTime(s.lastEditedAt)}` : "Not edited"} · {s.fields.filter(answered).length} of {s.fields.length} answered
                  </span>
                </span>
                <ChevronDown className={`mt-1 size-4 shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {open ? (
                <dl id={panelId} className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3.5 @min-[560px]:grid-cols-2">
                  {fields.map((f) => (
                    <Field key={f.id} f={f} />
                  ))}
                </dl>
              ) : null}
            </section>
          );
        })
      )}
    </section>
  );
}
