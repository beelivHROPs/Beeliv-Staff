"use client";

import { useStaffHome, useStaffProfile } from "@/lib/staff/hooks";
import { HomeHero } from "./HomeHero";
import { HomeMobile } from "./HomeMobile";
import { HomeDesktop, HomeDesktopSkeleton } from "./HomeDesktop";
import { HomeError, HomeGate, HomeSkeleton } from "./HomeStates";
import { OnboardingJourney, OnboardingSkeleton } from "./OnboardingJourney";
import { usePilotMenu } from "@/lib/pilot/context";
import { AnnouncementsCard, AssignmentCard, NotificationsCard, QuickActions, RequiredCard, SupportCard } from "./HomeSections";

/**
 * Staff Home. Mobile order is the DOM/`order-*` sequence (today -> required ->
 * upcoming -> training -> announcements). At 1241px+ two columns take over via
 * `contents` wrappers: left = assignment / upcoming / required / leave /
 * training, right = today / attendance / announcements / notifications / help.
 */
export function HomeBody() {
  const { data: home, status, retry } = useStaffHome();
  const pilot = usePilotMenu();
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

  if (pilot) {
    // Pilot menu: schedule, attendance, leave and training cards point only at later-stage screens, so they are left out.
    return (
      <div className="flex flex-col gap-5">
        <HomeHero home={home} />
        <QuickActions />
        <div className="flex flex-col gap-5 min-[1241px]:grid min-[1241px]:grid-cols-[minmax(0,1fr)_340px] min-[1241px]:items-start min-[1600px]:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <AssignmentCard a={home.assignment} className="" />
            <RequiredCard actions={home.requiredActions} className="" />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <AnnouncementsCard items={home.announcements} className="" />
            <NotificationsCard className="" />
            <SupportCard className="" />
          </div>
        </div>
      </div>
    );
  }
  // Phones keep the calm single-column Home; from 1000px the richer dashboard takes over. The older desktop cards (HomeSections) remain only for the pilot menu above.
  return (
    <>
      <div className="min-[1000px]:hidden">
        <HomeMobile home={home} />
      </div>
      <div className="max-[999px]:hidden">
        <HomeDesktop home={home} />
      </div>
    </>
  );
}
