"use client";

import Link from "next/link";
import { Camera, Check, Pencil } from "@/components/applicant/icons";
import { PremiumRing } from "@/components/shared/premium";
import { Avatar } from "../primitives";

/**
 * Phone-only Profile header (Applicant). One soft hero: the photo sits inside a ring that IS the
 * profile-completion arc (so the percentage is shown once, as words beside it), a round camera
 * button overlaps the photo, then name, one muted line and one action. Decorative only otherwise.
 * Data and the photo flow stay with ProfileBody; this component just presents them.
 */
export function PhoneProfileHeader({
  name,
  initials,
  line,
  photo,
  percent,
  hasStaff,
  firstMissing,
  onCamera,
  onFinish,
}: {
  name: string;
  initials: string;
  /** Headline or role, plus location. */
  line: string;
  photo: string | null;
  percent: number;
  hasStaff: boolean;
  /** Where "Finish profile" goes; null when the profile is complete. */
  firstMissing: { href?: string; onClick?: () => void } | null;
  onCamera: () => void;
  onFinish?: () => void;
}) {
  const done = percent >= 100;
  const pillClass =
    "ap-btn ap-btn-p ap-btn-hero mt-3.5 text-white!";
  return (
    <section
      aria-label="Your profile"
      className="relative isolate overflow-hidden rounded-[28px] border border-[#e6dcee] px-5 pt-5 pb-5 text-center min-[768px]:hidden"
      style={{ background: "linear-gradient(165deg,#efe6f7 0%,#f6effa 48%,#f3e9d4 100%)" }}
    >
      <svg className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 360 330" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <defs>
          <pattern id="pph-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#5b087b" fillOpacity=".09" />
          </pattern>
        </defs>
        <rect x="0" y="190" width="170" height="140" fill="url(#pph-dots)" />
        <circle cx="330" cy="20" r="110" fill="none" stroke="#5b087b" strokeOpacity=".08" strokeWidth="1.5" />
        <circle cx="330" cy="20" r="70" fill="none" stroke="#c1ac75" strokeOpacity=".28" strokeWidth="1.5" />
        <circle cx="20" cy="330" r="80" fill="#c1ac75" fillOpacity=".12" />
      </svg>

      <Link
        href="/applicant/profile/edit"
        aria-label="Edit your details"
        className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/70 text-(--ap-ink) hover:bg-white"
      >
        <Pencil className="size-[20px]" aria-hidden="true" />
      </Link>

      <div className="relative mx-auto w-fit">
        <PremiumRing
          value={percent / 100}
          size={104}
          stroke={6}
          arc={done ? "var(--ap-ok,#15803d)" : "#b8963a"}
          track="rgba(91,8,123,.12)"
          label={done ? "Profile complete" : `Profile ${percent} percent complete`}
        >
          {photo ? (
            <Avatar size={86} className="border-0! shadow-none!" />
          ) : (
            <span className="flex size-[86px] items-center justify-center rounded-full bg-white/80 text-[30px] font-semibold text-(--ap-violet)">{initials}</span>
          )}
        </PremiumRing>
        <button
          type="button"
          onClick={onCamera}
          aria-label="Change profile photo"
          className="absolute right-[-10px] bottom-[-2px] flex size-12 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-(--ap-violet) text-white shadow-[0_4px_10px_rgba(37,0,68,0.22)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)"
        >
          <Camera className="size-[22px]" aria-hidden="true" />
        </button>
      </div>

      <h1 className="ap-serif mt-3 text-[26px] leading-tight wrap-anywhere text-(--ap-ink)">{name}</h1>
      <p className="mt-0.5 text-[15px] text-(--ap-muted)">{line}</p>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[14px] font-semibold">
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 ${done ? "text-(--ap-ok)" : "text-(--ap-ink-2)"}`}>
          {done ? <Check className="size-4" strokeWidth={2.2} aria-hidden="true" /> : null}
          {done ? "Profile complete" : `Profile ${percent}% complete`}
        </span>
        {hasStaff ? <span className="rounded-full bg-(--ap-violet) px-3 py-1.5 text-white">Staff</span> : null}
      </div>

      {firstMissing ? (
        firstMissing.href ? (
          <Link href={firstMissing.href} className={pillClass}>
            Finish profile
          </Link>
        ) : (
          <button type="button" onClick={onFinish} className={pillClass}>
            Finish profile
          </button>
        )
      ) : null}

    </section>
  );
}
