import { T } from "@/components/public/primitives";
import { NAV_UI, STEPS } from "@/lib/public-site/request-content";
import { REQUEST_ROUTES } from "@/lib/public-site/request-content";
import { FormFrame } from "./FormFrame";
import { MobileProgress, RqButton, StepIndicator, SummaryCard, UpcomingCard } from "./parts";
import { NeedsFieldset } from "./StepFields";

/**
 * Loading skeleton for the form column (Skel-Request-Desktop / -Mobile.dc.html):
 * the wireframe's step-2 layout with text and buttons swapped for soft
 * shimmering blocks (`.skel` styles in app/(public)/public-site.css). Also shown
 * for the instant before the wizard has read its saved answers from
 * sessionStorage.
 */
export function RequestFormSkeleton() {
  return (
    <div className="skel" aria-busy="true">
      <p role="status" className="sr-only">
        Loading
      </p>
      <FormFrame as="div">
        <StepIndicator step={2} animated={false} />
        <MobileProgress step={2} animated={false} />
        <SummaryCard
          title={STEPS[0].title}
          text="Your business details"
          animated={false}
        />
        <NeedsFieldset selected={["recruitment"]} animated={false} readOnly />
        <div className="mt-1 flex flex-col wf-d:mt-0 wf-d:flex-row wf-d:items-center">
          <span className="hidden text-[15px] font-semibold wf-d:inline-block">
            <T>{NAV_UI.back}</T>
          </span>
          <RqButton label={NAV_UI.next} className="w-full wf-d:ml-auto wf-d:w-auto" />
        </div>
        <UpcomingCard n={3} title={STEPS[2].title} desktop={STEPS[2].upcoming.desktop} mobile={STEPS[2].upcoming.mobile} />
        <UpcomingCard n={4} title={STEPS[3].title} desktop={STEPS[3].upcoming.desktop} mobile={STEPS[3].upcoming.mobile} />
        <p className="ps-sm hidden !text-[13px] wf-d:block">
          <T>{NAV_UI.privacyLead}</T> <a href={REQUEST_ROUTES.privacy}><T>{NAV_UI.privacyLink}</T></a>
        </p>
      </FormFrame>
    </div>
  );
}
