"use client";

import { useStaffHome, useStaffProfile } from "@/lib/staff/hooks";
import { HomeMobile } from "./HomeMobile";
import { HomeDesktop, HomeDesktopSkeleton } from "./HomeDesktop";
import { HomeError, HomeGate, HomeSkeleton } from "./HomeStates";
import { OnboardingJourney, OnboardingSkeleton } from "./OnboardingJourney";
import { FormHomeCard } from "../forms/FormPrompt";

/**
 * Staff Home. Mobile order is the DOM/`order-*` sequence (today -> required ->
 * upcoming -> training -> announcements). At 1241px+ two columns take over via
 * `contents` wrappers: left = assignment / upcoming / required / leave /
 * training, right = today / attendance / announcements / notifications / help.
 */
export function HomeBody() {
  const { data: home, status, retry } = useStaffHome();
  // The shell already loaded the profile, so new staff see a skeleton that matches their own screen.
  const onboarding = useStaffProfile().data?.accountStatus === "onboarding";
  if (status === "loading")
    return onboarding ? (
      <OnboardingSkeleton />
    ) : (
      <>
        <div className="min-[1000px]:hidden">
          <HomeSkeleton />
        </div>
        <HomeDesktopSkeleton />
      </>
    );
  if (status === "error" || !home) return <HomeError retry={retry} />;

  const s = home.profile.accountStatus;
  if (s !== "active" && s !== "onboarding") return <HomeGate status={s} />;
  if (s === "onboarding") return <OnboardingJourney home={home} />;

  // Lead 2026-11-24: always the approved Home (same as localhost); the older pilot-menu cards are no longer used.
  // Phones keep the calm single-column Home; from 1000px the richer dashboard takes over.
  return (
    <>
      <div className="mb-5 empty:hidden">
        <FormHomeCard />
      </div>
      <div className="min-[1000px]:hidden">
        <HomeMobile home={home} />
      </div>
      <div className="max-[999px]:hidden">
        <HomeDesktop home={home} />
      </div>
    </>
  );
}
