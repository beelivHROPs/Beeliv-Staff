import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "@/components/applicant/icons";
import { Reveal } from "@/components/applicant/motion";
import { outletImage } from "@/lib/client/assets";
import { fullDate, greetingForNow, todayISO } from "@/lib/client/format";
import { attendanceHref, NEW_REQUEST_HREF } from "@/lib/client/links";
import type { ClientOverview, Outlet } from "@/lib/client/types";
import { UserPlus } from "../icons";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * Overview greeting (calm redesign, sample). One tinted panel: a short human
 * sentence, one pill action, a plain "checked in" line and, from tablet up,
 * the outlet's photo with a small overlay label (approved placeholder photo
 * until the outlet supplies its own). On phones: text only, no photo, no box.
 */
export function Banner({ ov, firstOutlet }: { ov: ClientOverview; firstOutlet: Outlet | null }) {
  const m = ov.metrics;
  const photo = outletImage(ov.outlet ?? firstOutlet);
  // Pilot menu: attendance is a later-stage screen, so its sentence and link are left out, and so are attention items that point only there.
  const hidden = usePilotHidden();
  const attendanceHidden = hidden(attendanceHref());
  const n = ov.attention.filter((i) => !hidden(i.href)).length;
  return (
    <Reveal as="section" aria-label="Welcome" className="grid overflow-hidden min-[768px]:min-h-[176px] min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,36%)] min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-tint)">
      <div className="min-w-0 min-[768px]:p-6">
        <p className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[.14em] text-(--ap-muted) uppercase">
          <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-(--ap-gold)" />
          {greetingForNow().replace(",", "")} · {fullDate(todayISO())}
        </p>
        <h1 className="ap-serif mt-2 text-[26px] leading-[1.1] min-[768px]:mt-3 min-[768px]:text-[32px]">Welcome back, {ov.greetingName}.</h1>
        <p className="mt-1.5 max-w-[48ch] text-[14.5px] leading-[1.5] text-(--ap-ink-2)">
          <b className="font-semibold text-(--ap-ink)">{n === 0 ? "Nothing needs you today." : n === 1 ? "1 thing needs you today." : `${n} things need you today.`}</b>{" "}
          {attendanceHidden ? null : m.scheduled ? `${ov.checkedIn} of ${m.scheduled} staff have checked in at ${ov.scopeLabel}.` : `No one is scheduled at ${ov.scopeLabel} today.`}
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href={NEW_REQUEST_HREF} className="ap-btn ap-btn-p h-11 rounded-full px-5 text-[14px] text-white! min-[768px]:h-10">
            <UserPlus className="size-4" aria-hidden="true" /> Request staff
          </Link>
          {attendanceHidden ? null : (
            <Link href={attendanceHref({ date: "today" })} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-(--ap-violet) min-[768px]:min-h-10">
              Live attendance <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <div className="relative m-3 overflow-hidden rounded-[8px] max-[767px]:hidden">
        <Image src={photo} alt="" fill priority sizes="(max-width: 1360px) 40vw, 480px" className="object-cover" />
        {ov.outlet ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,253,248,.92)] px-2.5 py-1 text-[12px] font-semibold text-[#321824]">
            <MapPin className="size-3.5" aria-hidden="true" />
            {ov.outlet.location}
          </span>
        ) : null}
      </div>
    </Reveal>
  );
}
