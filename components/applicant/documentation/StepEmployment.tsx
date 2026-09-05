"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TextField, TextAreaField } from "./fields";
import { SAMPLE_DOCUMENTATION_INTAKE } from "@/lib/placeholder-data";

/**
 * Step 2 — Employment History. Current and Previous employment are both
 * "employment history" per docs/BEELIV-SOURCE-OF-TRUTH.md §7 and
 * docs/BEELIV-APPLICANT-JOURNEY.md stage 4 recommendation items 2-3.
 *
 * "Are you currently employed?" toggle — Proposed Enhancement, not (yet) a
 * confirmed requirement: §7's field list has both Current and Previous
 * Employment as always-collected, independent blocks — no conditional
 * branch, and nothing saying they're mutually exclusive. Reshaped this
 * session (project-lead direction) into an exclusive either/or: Yes shows
 * only Current Employment, No shows only Previous Employment, unanswered
 * shows neither. Logged as an open item in BEELIV-SOURCE-OF-TRUTH.md §17
 * pending Beeliv management sign-off — this is the one genuinely
 * interactive control on this otherwise fully-disabled placeholder wizard
 * (same carve-out as PasswordField's show/hide toggle); it only branches
 * which fields render, no data is captured or submitted.
 *
 * Starts unanswered (`null`) — nothing below the question renders until the
 * applicant actually picks Yes or No. Reveal uses the same CSS-only
 * `grid-template-rows: 0fr → 1fr` height animation as components/shared/
 * Faq.tsx rather than a hard show/hide.
 */
export function StepEmployment() {
  const { current, previous } = SAMPLE_DOCUMENTATION_INTAKE.employment;
  const [isEmployed, setIsEmployed] = useState<boolean | null>(null);

  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Employment History</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Tell us about your current job, or your most recent one if you&apos;re between jobs.
        </p>

        {/* Standalone question box — bigger and more prominent than an
            inline row, since this decides whether anything below it even
            renders, and which of the two field sets it is. */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            Are you currently employed?
          </p>
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onClick={() => setIsEmployed(true)}
              aria-pressed={isEmployed === true}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                isEmployed === true
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setIsEmployed(false)}
              aria-pressed={isEmployed === false}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                isEmployed === false
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              No
            </button>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isEmployed === null ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-4">
              {isEmployed === true ? (
                <>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Current Employment
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Organization name" defaultValue={current.organizationName} />
                    <TextField
                      label="Organization location"
                      defaultValue={current.organizationLocation}
                    />
                    <TextField
                      label="Organization website/email/social handle"
                      defaultValue={current.organizationContact}
                    />
                    <TextField label="Job position" defaultValue={current.jobPosition} />
                    <TextField
                      label="Reporting manager/supervisor name"
                      defaultValue={current.reportingManager}
                    />
                  </div>
                  <div className="mt-4">
                    <TextAreaField label="Job description" defaultValue={current.jobDescription} />
                  </div>
                </>
              ) : isEmployed === false ? (
                <>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Previous Employment
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Organization name" defaultValue={previous.organizationName} />
                    <TextField
                      label="Organization location"
                      defaultValue={previous.organizationLocation}
                    />
                    <TextField
                      label="Organization website/email/social handle"
                      defaultValue={previous.organizationContact}
                    />
                    <TextField label="Job position" defaultValue={previous.jobPosition} />
                    <TextField
                      label="Reporting manager/supervisor name"
                      defaultValue={previous.reportingManager}
                    />
                    <TextField label="Start month" type="month" defaultValue={previous.startMonth} />
                    <TextField label="End month" type="month" defaultValue={previous.endMonth} />
                  </div>
                  <div className="mt-4">
                    <TextAreaField label="Job description" defaultValue={previous.jobDescription} />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
