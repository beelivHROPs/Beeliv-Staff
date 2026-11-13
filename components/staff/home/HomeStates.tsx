"use client";

import { Clock3, Mail } from "@/components/applicant/icons";
import { STAFF_ART } from "@/lib/staff/assets";
import { StatusGate, type GateTone } from "../StatusGate";
import { ErrorPanel } from "../ErrorPanel";
import type { AccountStatus } from "@/lib/staff/types";
import { ShieldAlert } from "../icons";
import { Sk } from "../kit";

/** Matches the Home layout: greeting, the one hero, then the hours card beside a quiet column. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8" aria-busy="true" aria-label="Loading your Home">
      <h1 className="sr-only">Home</h1>
      <div className="flex flex-col gap-2 min-[1000px]:col-span-2">
        <Sk className="h-4 w-32" />
        <Sk className="h-9 w-56" />
      </div>
      <Sk className="h-[300px] rounded-[26px]" />
      <div className="flex flex-col gap-5">
        <Sk className="h-[260px] rounded-[26px]" />
        <Sk className="h-[188px]" />
      </div>
    </div>
  );
}

export function HomeError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-[860px] pt-4 min-[768px]:pt-10">
      <h1 className="sr-only">Home</h1>
      <ErrorPanel title="We couldn't load your Home" retry={retry} />
    </div>
  );
}

const GATE: Partial<Record<AccountStatus, { tone: GateTone; image: string | null; icon: typeof Mail; chip: string; title: string; lead: string; next: string }>> = {
  "invitation-required": {
    tone: "action",
    image: STAFF_ART.gateInvitation,
    icon: Mail,
    chip: "Action needed",
    title: "Your Staff Hub invitation is needed",
    lead: "Beeliv sets up staff accounts by invitation, so your Staff Hub opens once you accept yours.",
    next: "Accept the invitation Beeliv sent to your email, or ask Beeliv to send it again.",
  },
  "invitation-expired": {
    tone: "warn",
    image: STAFF_ART.gateExpired,
    icon: Clock3,
    chip: "Invitation expired",
    title: "This invitation has expired",
    lead: "For your security, invitations only work for a limited time.",
    next: "Ask Beeliv to send you a new invitation, then open the new link.",
  },
  suspended: {
    tone: "critical",
    image: STAFF_ART.gateSuspended,
    icon: ShieldAlert,
    chip: "Account suspended",
    title: "Your staff account is suspended",
    lead: "You can't use Staff Hub right now. Your information is kept safe.",
    next: "Please contact Beeliv to find out more and what happens next.",
  },
  deactivated: {
    tone: "neutral",
    image: STAFF_ART.gateInactive,
    icon: ShieldAlert,
    chip: "Account inactive",
    title: "Your staff account is no longer active",
    lead: "Staff Hub isn't available on this account any more.",
    next: "If you think this is a mistake, please contact Beeliv.",
  },
};

/** Invitation required / expired, suspended, deactivated. */
export function HomeGate({ status }: { status: AccountStatus }) {
  const g = GATE[status];
  if (!g) return null;
  return (
    <StatusGate
      tone={g.tone}
      image={g.image}
      icon={g.icon}
      chip={g.chip}
      title={g.title}
      lead={g.lead}
      next={g.next}
      primary={{ label: "Contact Beeliv", href: "/staff/help" }}
      secondary={{ label: "Go to applicant area", href: "/applicant" }}
    />
  );
}
