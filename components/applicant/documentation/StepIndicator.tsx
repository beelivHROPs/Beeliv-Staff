/**
 * Step indicator for the Documentation wizard — reuses the numbered-circle /
 * connector visual language already established by components/applicant/
 * ApplicationJourney.tsx and app/applicant/application/page.tsx's local
 * ApplicationStepper (done/current/upcoming states), generalized to 6 steps
 * with optional click-to-jump-back navigation. No new visual system
 * invented.
 */

export interface DocumentationStepMeta {
  label: string;
}

type StepVisualState = "done" | "current" | "upcoming";

function stateFor(index: number, currentIndex: number): StepVisualState {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "upcoming";
}

export function StepIndicator({
  steps,
  currentIndex,
  onStepSelect,
}: {
  steps: DocumentationStepMeta[];
  currentIndex: number;
  /** Lets an applicant jump back to an already-completed step. Forward
   *  jumps are intentionally not allowed here — the confirmed section
   *  order (sensitive fields last) should never be skippable ahead of. */
  onStepSelect?: (index: number) => void;
}) {
  // Mobile: showing all 6 steps at once — whether squeezed into flex-1
  // columns (the original bug: multi-word labels like "Next of Kin" wrapped)
  // or a horizontally-scrolling row of the same (tried next, still judged
  // worse than the alternative) — was the wrong shape for a phone. The
  // wizard already renders one step's fields at a time; the indicator now
  // matches that: just the current step's label + "Step X of Y", with a
  // segmented progress bar underneath standing in for the 6 circles. Each
  // segment stays a real button so jump-back-to-a-done-step is preserved
  // without needing per-step text (which is what caused the wrapping).
  // Desktop never had this problem and is unchanged below.
  const currentStep = steps[currentIndex];
  return (
    <>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{currentStep?.label}</span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {steps.map((step, i) => {
            const state = stateFor(i, currentIndex);
            const clickable = Boolean(onStepSelect) && i <= currentIndex && state !== "current";
            return (
              <button
                key={step.label}
                type="button"
                disabled={!clickable}
                onClick={() => onStepSelect?.(i)}
                aria-label={`Go to step ${i + 1}: ${step.label}`}
                aria-current={state === "current" ? "step" : undefined}
                className={`h-1.5 flex-1 rounded-full transition-colors disabled:cursor-default ${
                  state === "upcoming" ? "bg-border" : state === "done" ? "bg-success" : "bg-primary"
                } ${clickable ? "cursor-pointer hover:opacity-70" : ""}`}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden items-start sm:flex">
        {steps.map((step, i) => {
          const state = stateFor(i, currentIndex);
          const clickable = Boolean(onStepSelect) && i <= currentIndex && state !== "current";
          return (
            <div key={step.label} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onStepSelect?.(i)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors disabled:cursor-default ${
                    state === "done"
                      ? "border-success bg-success text-white"
                      : state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                  } ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}
                >
                  {state === "done" ? "✓" : i + 1}
                </button>
                <div
                  className={`text-xs font-semibold ${
                    state === "current"
                      ? "text-primary"
                      : state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </div>
              </div>
              {i < steps.length - 1 ? (
                <div className="relative top-3.5 mx-1 h-0.5 flex-1 overflow-hidden rounded bg-border">
                  <div className={`h-full ${state === "done" ? "w-full bg-success" : "w-0"}`} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
