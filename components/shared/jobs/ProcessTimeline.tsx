/**
 * "Recruitment process": the ONE timeline used by the Applicant job page and the public job page.
 * A single vertical column at every width: a numbered marker per step on a straight connector line, the label
 * to its right. Labels wrap inside their own row (`min-w-0`, `overflow-wrap:anywhere`), nothing has a fixed
 * width, so long names such as "Application Review/Shortlisting" can never run under the next marker or clip
 * at the edge, whether the job has 3 steps or 9. Colours come from the --ap-* tokens that both the Applicant
 * shell and the public site define. Server-safe (no state).
 */
export function ProcessTimeline({ steps, className = "" }: { steps: readonly string[]; className?: string }) {
  return (
    <ol className={`m-0 flex list-none flex-col p-0 ${className}`}>
      {steps.map((label, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={`${i}-${label}`} className={`relative flex min-w-0 items-start gap-3 ${last ? "" : "pb-[18px]"}`}>
            {last ? null : <span aria-hidden="true" className="absolute top-7 bottom-0 left-3.5 w-px -translate-x-1/2 bg-[#d9cfe6]" />}
            <span
              aria-hidden="true"
              className={`relative flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] leading-none font-bold ${
                i === 0 ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-[#d9cfe6] bg-white text-(--ap-muted)"
              }`}
            >
              {i + 1}
            </span>
            <span className="sr-only">Step {i + 1}: </span>
            <span className="min-w-0 flex-1 pt-[3px] text-[15px] leading-[1.4] font-semibold [overflow-wrap:anywhere] text-(--ap-ink-2)">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
