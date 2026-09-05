"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepEmployment } from "./StepEmployment";
import { StepNextOfKin } from "./StepNextOfKin";
import { StepSensitive } from "./StepSensitive";
import { StepDocuments } from "./StepDocuments";
import { StepTerms } from "./StepTerms";
import { DISABLED_FIELD_TITLE } from "./constants";

const STEPS = [
  { label: "Personal Info" },
  { label: "Employment" },
  { label: "Next of Kin" },
  { label: "Sensitive Info" },
  { label: "Documents" },
  { label: "Terms" },
];

/**
 * Multi-step Documentation intake wizard — the actual data-entry form for
 * recruitment workflow stage 4 ("Documentation"). Section order (non-
 * sensitive fields first, sensitive/banking fields near the end, Terms &
 * Declarations last) follows docs/BEELIV-APPLICANT-JOURNEY.md stage 4's
 * Professional Recommendation exactly — do not reorder. Full field set:
 * docs/BEELIV-SOURCE-OF-TRUTH.md §7.
 *
 * Entirely structural: no Supabase Auth/database/storage wiring exists yet
 * (Stage 1). Every field renders disabled with an explanatory title; step
 * navigation is local client state only (useState), nothing is persisted,
 * validated, or submitted. Field-by-field requiredness is not confirmed
 * anywhere (docs/requirements.md §5), so no field is marked required and no
 * validation gates step navigation.
 */
export function DocumentationWizard() {
  const [step, setStep] = useState(0);
  // Direction drives which way the step content slides in (Next → from the
  // right, Back → from the left, jump-back via the indicator's segments →
  // also from the left since it only ever targets an earlier step). Only
  // one step is ever mounted at a time — same as before — so this is just a
  // per-mount entrance animation, not a true two-panel carousel.
  const [direction, setDirection] = useState<1 | -1>(1);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Without this, moving to a step whose fields are shorter than however far
  // the applicant had scrolled into the previous step left the page stranded
  // mid-scroll — the new step could open already scrolled past its own
  // fields. Scrolls the indicator/content block back into view on every step
  // change (but not on first mount, where the page is already there).
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function goTo(next: number) {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  }

  return (
    <div ref={topRef}>
      <Card>
        <CardContent>
          <StepIndicator steps={STEPS} currentIndex={step} onStepSelect={goTo} />
        </CardContent>
      </Card>

      <div className="mt-4 overflow-hidden">
        <div key={step} className={direction === 1 ? "animate-slide-in-right" : "animate-slide-in-left"}>
          {step === 0 ? <StepPersonalInfo /> : null}
          {step === 1 ? <StepEmployment /> : null}
          {step === 2 ? <StepNextOfKin /> : null}
          {step === 3 ? <StepSensitive /> : null}
          {step === 4 ? <StepDocuments /> : null}
          {step === 5 ? <StepTerms /> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={isFirst}
          onClick={() => goTo(Math.max(0, step - 1))}
        >
          Back
        </Button>

        {isLast ? (
          <Button type="button" disabled title={DISABLED_FIELD_TITLE}>
            Submit Documentation
          </Button>
        ) : (
          <Button type="button" onClick={() => goTo(Math.min(STEPS.length - 1, step + 1))}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
