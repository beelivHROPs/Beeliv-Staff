"use client";

import { GettingStartedCard, type GettingStartedItem } from "@/components/shared/setup/GettingStarted";
import { useOnboarding } from "@/lib/client/hooks";
import type { OnboardingItemId } from "@/lib/client/types";

/**
 * Client "Getting started" card on Overview: the non-blocking "Complete your profile" group of the ONE
 * guided onboarding (docs/ONBOARDING-FLOW-MERGED-2026-11-12.md). Account setup (details, agreements) happens on
 * /client/setup and is never repeated here. Each step opens the existing Settings section; a tick comes only
 * from the server's onboarding data. Renders nothing while loading, on failure or once everything is done,
 * so it can never block the page.
 */
const STEPS: Partial<Record<OnboardingItemId, { title: string; why: string; href: string; action: string }>> = {
  details: { title: "Confirm your details", why: "Your name, job title and how you like to be contacted.", href: "/client/settings#s-profile", action: "Confirm details" },
  notifications: { title: "Choose your notifications", why: "Pick the updates you want from Beeliv.", href: "/client/settings#s-notif", action: "Choose" },
  access: { title: "Review your outlets and access", why: "See which outlets you can see.", href: "/client/settings#s-access", action: "Review" },
};

export function OnboardingWelcome() {
  const { data: ob } = useOnboarding();
  if (!ob || ob.status === "complete") return null;
  const items: GettingStartedItem[] = ob.items.flatMap((i) => {
    const s = STEPS[i.id];
    return s ? [{ id: i.id, title: s.title, why: s.why, done: i.done, href: s.href, actionLabel: s.action }] : [];
  });
  return <GettingStartedCard items={items} />;
}
