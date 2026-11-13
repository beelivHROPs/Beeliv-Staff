"use client";

import { Check } from "@/components/applicant/icons";
import { useApplicantStore } from "@/lib/applicant/service";
import { describeApplicationStatus } from "@/lib/applicant/status";
import { formatDate } from "@/lib/applicant/time";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import { History } from "../icons";
import { Dot, PANEL, StateCard } from "../kit";

/**
 * Application history, inside the Staff account. The same person applied to
 * Beeliv before joining, so those applications are shown here (read-only)
 * instead of sending staff back to the Applicant dashboard, which is easy to
 * mistake for a second account. Drafts are left out: only applications that
 * were actually submitted.
 */
const TONE = { ok: "ok", info: "info", warn: "warn", mute: "mute", plum: "info", violet: "info", rose: "rose" } as const;

export function ApplicationHistoryBody() {
  const { applications } = useApplicantStore();
  const submitted = applications
    .filter((a) => a.lifecycle !== "draft" && a.submittedAt)
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  return (
    <div className="w-full pt-1 pb-2">
      <h1 className="text-[28px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[32px]">Application history</h1>
      <p className="mt-1 mb-5 text-[16px] text-(--ap-muted)">The applications you made to Beeliv before joining the team. This is a record only.</p>

      {submitted.length === 0 ? (
        <StateCard glass="applications" icon={History} title="No applications on record" text="Applications you made before joining Beeliv will appear here." />
      ) : (
        <ul className={`${PANEL} overflow-hidden min-[1000px]:grid min-[1000px]:grid-cols-2`}>
          {submitted.map((a) => {
            const st = describeApplicationStatus(a);
            const reached = APPLICATION_STAGES.map((name, i) => ({ name, at: a.stageDates[i] })).filter((s) => s.at);
            const tone = TONE[st.tone as keyof typeof TONE] ?? "info";
            return (
              <li key={a.id} className="border-t border-(--ap-line-2) p-5 first:border-t-0 min-[1000px]:[&:nth-child(2)]:border-t-0 min-[1000px]:even:border-l">
                <article>
                  <Dot tone={tone}>{st.label}</Dot>
                  <h2 className="mt-2 text-[18px] leading-snug font-bold wrap-anywhere text-(--ap-ink)">{a.role}</h2>
                  <p className="mt-0.5 text-[16px] text-(--ap-ink-2)">
                    {a.company} · {a.location}
                  </p>
                  <p className="mt-1.5 text-[15px] text-(--ap-muted)">
                    Applied {formatDate(a.submittedAt as string)} · {a.employmentType}
                  </p>

                  {reached.length ? (
                    <ol className="m-0 mt-4 flex list-none flex-col gap-2 border-t border-(--ap-line-2) p-0 pt-4" aria-label="Steps this application went through">
                      {reached.map((s) => (
                        <li key={s.name} className="flex items-center gap-2.5 text-[15px]">
                          <Check className="size-4 shrink-0 text-(--ap-ok)" aria-hidden="true" />
                          <span className="min-w-0 flex-1 text-(--ap-ink-2)">{s.name}</span>
                          <span className="shrink-0 text-[14px] text-(--ap-muted) tabular-nums">{formatDate(s.at as string)}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
