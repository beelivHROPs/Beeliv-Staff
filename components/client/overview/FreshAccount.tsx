import Image from "next/image";
import Link from "next/link";
import { Calendar, Check, Clock3, MapPin, UsersRound } from "@/components/applicant/icons";
import { Reveal } from "@/components/applicant/motion";
import { outletImage } from "@/lib/client/assets";
import { fullDate, greetingForNow, todayISO } from "@/lib/client/format";
import { NEW_REQUEST_HREF } from "@/lib/client/links";
import type { ClientOverview, Outlet } from "@/lib/client/types";
import { UserPlus } from "../icons";

/**
 * Overview for an account that is set up but has no workforce yet (nothing
 * scheduled, nothing recorded). No row of zeros and no "0 checked in": a warm
 * welcome with the two things the client can actually do (request staff, talk
 * to Beeliv), then what happens next. Once Beeliv assigns staff the normal
 * operational Overview takes over by itself.
 */
export function FreshBanner({ ov, firstOutlet }: { ov: ClientOverview; firstOutlet: Outlet | null }) {
  const photo = outletImage(ov.outlet ?? firstOutlet);
  return (
    <Reveal as="section" aria-label="Welcome" className="relative overflow-hidden rounded-[20px] bg-(--client-wine) text-white shadow-(--ap-shadow)">
      <Image src={photo} alt="" fill priority sizes="(max-width: 1360px) 100vw, 1360px" className="object-cover" />
      <span className="client-banner-shade absolute inset-0" aria-hidden="true" />
      <div className="relative p-5 min-[768px]:min-h-[208px] min-[768px]:p-7">
        <p className="text-[12px] font-bold tracking-[.2em] text-[#e0c9a3] uppercase">{greetingForNow().replace(",", "")}</p>
        <h1 className="ap-serif mt-1 text-[36px] leading-[1.05] text-white min-[768px]:text-[46px]">Welcome, {ov.greetingName}.</h1>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-[1.5] text-white/85">
          Beeliv is getting <b className="font-bold text-white">{ov.scopeLabel}</b> ready. Your team and their records will appear here as soon as they are assigned.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-white/80">
            <Calendar className="size-4" aria-hidden="true" />
            {fullDate(todayISO())}
          </span>
          {ov.outlet ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-white/80">
              <MapPin className="size-4" aria-hidden="true" />
              {ov.outlet.location}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5 max-[480px]:flex-col">
          <Link href={NEW_REQUEST_HREF} className="ap-btn h-11 bg-[rgba(255,255,255,.95)] text-(--client-wine)! hover:bg-white">
            <UserPlus className="size-4" aria-hidden="true" /> Request staff
          </Link>
          <Link href="/client/support" className="ap-btn h-11 border border-white/45 bg-white/10 text-white! hover:bg-white/20">
            Contact Beeliv
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

const NEXT = [
  { icon: UsersRound, title: "Beeliv assigns your staff", text: "Your Beeliv team places people at your outlet. You can ask for the roles you need." },
  { icon: Calendar, title: "Schedules appear", text: "Shifts and coverage for your team show up as soon as they are planned." },
  { icon: Clock3, title: "Attendance starts showing", text: "Once your team clocks in, you see who is on shift, late or away." },
] as const;

export function WhatHappensNext() {
  return (
    <Reveal as="section" aria-labelledby="next-h" className="ap-card rounded-[20px] p-5 min-[768px]:p-7">
      <h2 id="next-h" className="ap-serif text-[26px] leading-tight min-[768px]:text-[30px]">
        What happens next
      </h2>
      <ol className="m-0 mt-4 grid list-none grid-cols-1 gap-3 p-0 min-[900px]:grid-cols-3">
        {NEXT.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <b className="block text-[15px]">
                {i + 1}. {title}
              </b>
              <span className="ap-sm mt-0.5 block">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-col gap-3 border-t border-(--ap-line-2) pt-5 min-[640px]:flex-row min-[640px]:items-center">
        <div className="min-w-0 flex-1">
          <b className="block text-[16px]">Want to get started sooner?</b>
          <span className="ap-sm flex items-center gap-1.5">
            <Check className="size-4 shrink-0 text-(--ap-ok)" aria-hidden="true" />
            Your account is set up. Tell us the roles you need and your Beeliv team takes it from there.
          </span>
        </div>
        <div className="flex flex-col gap-2.5 min-[480px]:flex-row">
          <Link href={NEW_REQUEST_HREF} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
            <UserPlus className="size-4" aria-hidden="true" /> Request staff
          </Link>
          <Link href="/client/support" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            Contact Beeliv
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
