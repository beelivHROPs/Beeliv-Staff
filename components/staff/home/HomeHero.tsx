"use client";

import { CircleAlert, Clock3, MapPin } from "@/components/applicant/icons";
import { Reveal, Unveil } from "@/components/applicant/motion";
import { toast } from "@/components/ui/toast";
import { STAFF_ART } from "@/lib/staff/assets";
import { displayName, todayISO, formatClock, formatClockRange, formatDateTimeClock, greetingForNow, longDate } from "@/lib/staff/format";
import { checkIn, checkOut } from "@/lib/staff/service";
import type { StaffHome } from "@/lib/staff/types";
import { LogIn, CircleCheck } from "../icons";
import { LogOut } from "@/components/applicant/icons";
import { StaffHeroDeco } from "../StaffHeroDeco";
import { ActionPill, confirmAction } from "../kit";
import { HeroCarousel, HeroRotatingText, useHeroRotation } from "../HeroCarousel";
import { withStaffPreloader } from "../StaffPreloader";
import { usePilotMenu } from "@/lib/pilot/context";

function heroLine(home: StaffHome, pilot: boolean): string {
  const outlet = home.assignment?.client.name ?? "your outlet";
  if (!home.assignment) return "You don't have an assignment yet. Beeliv will let you know as soon as one is confirmed.";
  // Pilot menu: shifts and check-in are a later stage, so the line talks about the assignment only.
  if (pilot) return `You are part of the team at ${outlet}. Your assignment and documents are below.`;
  switch (home.today.state) {
    case "ready":
    case "upcoming":
      return `Ready for today's shift? Let's make it a great day at ${outlet}.`;
    case "checked-in":
      return `You're on shift at ${outlet}. Have a great one.`;
    case "checked-out":
      return "Your shift is complete. Thanks for today.";
    case "attention":
      return "Your attendance needs a quick look. Details are on the card.";
    default: {
      const next = home.upcoming.find((s) => s.date > todayISO());
      return next ? `No shift today. Your next shift is ${longDate(next.date)}, ${formatClock(next.startTime)}.` : "No shift today. Nothing is scheduled yet.";
    }
  }
}

/**
 * Lines shown with the 2nd+ hero pictures. Slide 1 is always the live status
 * line (heroLine). PLACEHOLDER COPY - for project-lead approval.
 */
const HERO_EXTRA_LINES = ["Great service starts with a great team. Thanks for being part of Beeliv."];

export function HomeHero({ home }: { home: StaffHome }) {
  const name = displayName(home.profile);
  const greeting = greetingForNow();
  // Pictures and the line under the name change together (project lead).
  const slide = useHeroRotation(STAFF_ART.heroCutouts.length);
  const pilot = usePilotMenu();
  const lines = [heroLine(home, pilot), ...HERO_EXTRA_LINES];
  return (
    <Reveal
      as="section"
      className={`relative isolate grid grid-cols-1 items-end gap-x-2 overflow-hidden rounded-[22px] border border-(--ap-line) bg-[linear-gradient(100deg,#FFFFFF,var(--ap-tint-soft)_55%,var(--ap-tint))] px-4 pt-4 min-[641px]:grid-cols-[minmax(0,1fr)_170px] min-[768px]:grid-cols-[minmax(0,1fr)_250px] min-[768px]:gap-x-5 min-[768px]:rounded-3xl min-[768px]:px-6 min-[768px]:pt-2 ${pilot ? "min-[1241px]:grid-cols-[minmax(0,1fr)_280px]" : "min-[1241px]:grid-cols-[minmax(0,1fr)_280px_minmax(300px,340px)]"} min-[1241px]:pr-[22px] min-[1241px]:pl-[26px] min-[1241px]:pt-0`}
    >
      <StaffHeroDeco />

      <div className="relative z-[2] self-center pb-5 min-[768px]:py-6.5">
        <div className="ap-eb mb-2">{greeting}</div>
        <h1 className="ap-serif -mt-0.5 text-[46px] leading-[0.95] text-(--ap-ink) max-[380px]:text-[40px] min-[768px]:text-[54px]">{name}.</h1>
        <HeroRotatingText lines={lines} index={slide} className="ap-bd mt-2.5 max-w-[36ch] text-(--ap-ink-2)" />
      </div>

      {/* CUTOUT room (STAFF_ART.heroCutouts, auto-rotating) */}
      <div className="relative z-[1] col-start-2 row-start-1 min-h-[168px] self-stretch max-[640px]:hidden min-[768px]:min-h-[236px]">
        <div className="absolute inset-x-0 top-2 bottom-0">
          <div className="absolute inset-0">
            <span className="absolute bottom-[-18%] left-1/2 z-0 aspect-square w-[84%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_38%,#FFFFFF_0,#F1EEFA_42%,#DDD6F3_68%,rgba(221,214,243,0)_70%)]" />
            <span className="absolute bottom-[-6%] left-1/2 z-[1] aspect-square w-[98%] -translate-x-1/2 rounded-full border-[1.5px] border-[rgba(105,84,200,.18)]" />
            <Unveil className="absolute inset-0 z-[2]">
              {/* Staff hero pictures rotate automatically (HeroCarousel). */}
              <div className="ap-float absolute inset-0">
                <HeroCarousel images={STAFF_ART.heroCutouts} index={slide} alt="Beeliv hospitality team member" priority phoneShift={STAFF_ART.heroPhoneShift} />
              </div>
            </Unveil>
          </div>
        </div>
      </div>

      {pilot ? null : <AttendanceCard home={home} />}
    </Reveal>
  );
}

/** Confirm, then record a check-in or check-out. Shared by the desktop hero card and the phone Today card. */
export async function runClock(kind: "in" | "out", shift: StaffHome["today"]["shift"]) {
  const ok = await confirmAction({
    tone: "neutral",
    icon: kind === "in" ? LogIn : LogOut,
    title: kind === "in" ? "Check in for your shift?" : "Check out of your shift?",
    description: shift ? `This records your ${kind === "in" ? "check-in" : "check-out"} for today's shift, ${formatClockRange(shift.startTime, shift.endTime)}.` : undefined,
    confirmLabel: kind === "in" ? "Check in" : "Check out",
  });
  if (!ok) return;
  try {
    await withStaffPreloader(kind === "in" ? "check-in" : "check-out", () => (kind === "in" ? checkIn() : checkOut()));
    toast.add({ title: kind === "in" ? "You're checked in" : "You're checked out", type: "success" });
  } catch {
    toast.add({ title: "We couldn't record that", description: "Please try again.", type: "error" });
  }
}

function AttendanceCard({ home }: { home: StaffHome }) {
  const { today, assignment } = home;
  const shift = today.shift;
  const where = shift ? `${shift.outlet} (${shift.section})` : assignment ? `${assignment.outlet.name}, ${assignment.outlet.location}` : null;

  let title = "No shift today";
  let sub = "You're currently off shift.";
  let action: "in" | "out" | null = null;
  let disabled = false;
  let extra: string | null = null;
  if (!assignment) {
    title = "No assignment yet";
    sub = "Check-in opens once you're assigned.";
  } else
    switch (today.state) {
      case "upcoming":
        title = "Shift upcoming";
        sub = shift ? `Your shift starts at ${formatClock(shift.startTime)}.` : "Your shift is coming up.";
        action = "in";
        disabled = true;
        break;
      case "ready":
        title = "Ready to check in";
        sub = shift ? `Your shift starts at ${formatClock(shift.startTime)}.` : "";
        action = "in";
        break;
      case "checked-in":
        title = "Checked in";
        sub = today.checkedInAt ? `Since ${formatDateTimeClock(today.checkedInAt)}` : "You're on shift.";
        extra = shift ? `Expected: ${formatClockRange(shift.startTime, shift.endTime)}` : null;
        action = "out";
        break;
      case "checked-out":
        title = "Checked out";
        sub = today.checkedOutAt ? `At ${formatDateTimeClock(today.checkedOutAt)}. Thanks for today.` : "Thanks for today.";
        break;
      case "attention":
        title = "Needs attention";
        sub = today.attentionReason ?? "Something needs a quick look.";
        break;
    }

  const run = (kind: "in" | "out") => runClock(kind, shift);

  const Icon = today.state === "checked-out" ? CircleCheck : today.state === "attention" ? CircleAlert : today.state === "checked-in" ? Clock3 : LogIn;
  return (
    <div className="staff-dark-card relative z-[3] col-span-full mb-4 self-center rounded-[18px] p-4 shadow-(--ap-shadow) min-[768px]:mb-5 min-[768px]:p-5 min-[1241px]:col-span-1 min-[1241px]:col-start-3 min-[1241px]:row-start-1 min-[1241px]:mb-0" aria-label="Today's attendance">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/14">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-bold tracking-[.14em] text-white/62 uppercase">Today&apos;s attendance</div>
          <b className="block text-[19px] leading-tight">{title}</b>
          <p className="ap-sm mt-0.5 text-white/78">{sub}</p>
          {extra ? <p className="ap-sm text-white/78">{extra}</p> : null}
        </div>
      </div>
      {action ? (
        <ActionPill icon={action === "in" ? LogIn : LogOut} variant="purple" disabled={disabled} onClick={() => run(action)} className="mt-4">
          {action === "in" ? "Check in" : "Check out"}
        </ActionPill>
      ) : today.state === "attention" ? (
        <ActionPill icon={CircleAlert} href="/staff/attendance" variant="purple" className="mt-4">
          View attendance
        </ActionPill>
      ) : null}
      {where ? (
        <div className="ap-sm mt-3 flex items-center gap-2 text-white/78">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{where}</span>
        </div>
      ) : null}
    </div>
  );
}
