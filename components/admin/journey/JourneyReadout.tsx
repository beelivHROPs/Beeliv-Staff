"use client";

/** Read-only view of a journey: one hairline list. Used on the vacancy detail page. */
import { JOURNEY_METHOD_LABEL, SCORER_LABEL, STEP_META, type Journey } from "@/lib/journeys/types";
import { stepTitle } from "./JourneyEditor";

export function JourneyReadout({ journey }: { journey: Journey }) {
  return (
    <ol className="m-0 list-none p-0" aria-label="Journey steps">
      {journey.map((s, i) => (
        <li key={s.id} className={`flex items-start gap-3 py-3 ${i === 0 ? "" : "border-t border-(--ap-line-2)"}`}>
          <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-(--ap-line) text-[12px] font-semibold text-(--ap-muted) tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-(--ap-ink)">{stepTitle(s)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-(--ap-muted)">
              {s.kind === "interview" && s.interview
                ? `${JOURNEY_METHOD_LABEL[s.interview.defaultMethod]}, ${s.interview.defaultMinutes} min. Scorecard: ${s.interview.criteria.map((c) => c.label).join(", ")}. Scored by ${s.interview.whoMayScore.map((r) => SCORER_LABEL[r]).join(", ")}.`
                : STEP_META[s.kind].help}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
