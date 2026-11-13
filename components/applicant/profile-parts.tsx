"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Calendar,
  Camera,
  Check,
  FileText,
  MapPin,
  Sparkles,
  UserRound,
} from "@/components/applicant/icons";
import type { Application, ApplicantDocument, ApplicantProfile, Interview, ProfileCompleteness } from "@/lib/applicant/types";
import { Avatar } from "./primitives";
import { IconTile } from "./SectionCard";

/* ------------------------------------------------------------------ */
/* Desktop profile (>= 768px): cover header, stats, completion, nav,   */
/* career highlights and career documents. Phones keep their own      */
/* header and tabs in ProfileBody.                                    */
/* ------------------------------------------------------------------ */

/** "Jan 2023 – Present · 3 yrs 9 mos" -> months (the saved period text already states the length). */
export function monthsInPeriod(period: string): number {
  const y = /(\d+)\s*yrs?/i.exec(period);
  const m = /(\d+)\s*mos?/i.exec(period);
  return (y ? parseInt(y[1], 10) * 12 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function formatYears(totalMonths: number): string {
  if (totalMonths <= 0) return "–";
  const y = Math.floor(totalMonths / 12);
  if (y === 0) return `${totalMonths} mo`;
  return `${y} yr${y === 1 ? "" : "s"}`;
}

/** Cover photo + overlapping avatar + identity and the edit button. The cover grows to match the completion card beside it. */
export function CoverHeader({
  name,
  profile,
  onCamera,
  onEdit,
}: {
  name: string;
  profile: ApplicantProfile;
  onCamera: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="ap-card hidden flex-1 flex-col overflow-hidden rounded-[20px] p-0 min-[768px]:flex">
      <div className="relative min-h-[120px] flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/applicant/profile-cover.webp" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,6,32,.05),rgba(20,6,32,.28))]" />
      </div>
      <div className="flex shrink-0 items-start gap-6 px-7 pb-4 max-[1100px]:gap-5 max-[1100px]:px-5">
        {/* Avatar rises over the bottom edge of the cover. */}
        <div className="relative -mt-[66px] size-[132px] shrink-0 min-[1101px]:-mt-[78px] min-[1101px]:size-[156px]">
          <Avatar
            size={156}
            className="size-full! border-[6px]! border-white! bg-[#EADAF3]! shadow-[0_0_0_1px_var(--ap-line),0_12px_28px_-10px_rgba(37,0,68,0.45)]!"
          />
          <button
            type="button"
            title="Change photo"
            onClick={onCamera}
            className="absolute right-0.5 bottom-1.5 flex size-[40px] cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-(--ap-violet) text-white shadow-[0_4px_10px_rgba(37,0,68,0.25)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)"
          >
            <Camera className="size-[19px]" aria-hidden="true" />
            <span className="sr-only">Change profile photo</span>
          </button>
        </div>

        <div className="min-w-0 flex-1 pt-4">
          <div className="flex items-start">
            <h1 className="ap-serif min-w-0 flex-1 truncate text-[40px] leading-[1.15] whitespace-nowrap">{name}</h1>
          </div>
          <p className="ap-bd mt-2 truncate text-(--ap-ink-2)">{profile.title || "Hospitality professional"}</p>
          <div className="ap-sm mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 whitespace-nowrap">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-[16px] shrink-0" aria-hidden="true" />
              {profile.location || "Abuja, FCT"}
            </span>
            {profile.availability ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-(--ap-ok)" aria-hidden="true" />
                {profile.availability}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="inline-flex h-7 items-center rounded-lg bg-(--ap-line-2) px-2.5 text-[13px] font-semibold whitespace-nowrap text-(--ap-ink-2) tabular-nums">Applicant ID · {profile.applicantId}</span>
            <button type="button" onClick={onEdit} className="ap-btn ap-btn-o ap-btn-sm shrink-0">
              Edit profile
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Quiet navigation tiles under the header: real counts only. */
export function ProfileStats({
  applications,
  interviews,
  percent,
}: {
  applications: Application[];
  interviews: Interview[];
  percent: number;
}) {
  const submitted = applications.filter((a) => a.lifecycle !== "draft");
  const scheduled = interviews.filter((v) => v.status === "scheduled").length;
  const withOffer = submitted.find((a) => a.offer);
  const tiles: { icon: typeof FileText; label: string; value: ReactNode; sub?: string; href?: string }[] = [
    { icon: FileText, label: "Applications", value: submitted.length, href: "/applicant/applications" },
    { icon: Calendar, label: "Interviews scheduled", value: scheduled, href: "/applicant/interviews" },
    ...(withOffer ? [{ icon: BriefcaseBusiness, label: "Offer received", value: withOffer.company, sub: withOffer.role, href: `/applicant/applications/${withOffer.id}/offer` }] : []),
    { icon: Sparkles, label: "Profile strength", value: `${percent}%` },
  ];
  return (
    <div className={`hidden gap-3 min-[768px]:grid ${tiles.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {tiles.map((t) => {
        const body = (
          <>
            <IconTile icon={t.icon} className="size-11 rounded-[14px]" iconClassName="size-5" />
            <span className="min-w-0">
              <span className="ap-label block text-(--ap-muted)">{t.label}</span>
              <b className="ap-title block truncate tabular-nums">{t.value}</b>
              {t.sub ? <span className="ap-label block truncate text-(--ap-muted)">{t.sub}</span> : null}
            </span>
          </>
        );
        const cls = `flex min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(83,25,95,.12)] p-3.5 ${t.label === "Offer received" ? "bg-(--ap-tint)" : "bg-white"}`;
        return t.href ? (
          <Link key={t.label} href={t.href} className={`${cls} text-(--ap-ink)! transition-[transform,border-color] duration-200 hover:-translate-y-px hover:border-[rgba(112,0,138,.4)]`}>
            {body}
          </Link>
        ) : (
          <div key={t.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Completion card with the whole checklist (done / still to do), one action, and the status note. */
export function CompletionCard({
  completeness,
  targetFor,
  onOpen,
}: {
  completeness: ProfileCompleteness;
  targetFor: (label: string) => string;
  onOpen: (target: string) => void;
}) {
  const left = completeness.missing.length;
  const first = completeness.missing[0];
  return (
    <aside className="ap-card hidden rounded-[20px] p-4 min-[768px]:block" aria-label="Profile completion">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="ap-serif text-[22px]">Profile completion</h2>
        <b className="text-[20px] tabular-nums">{completeness.percent}%</b>
      </div>
      <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-(--ap-line)" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness.percent} aria-label="Profile completion">
        <i className="block h-full rounded-full bg-[linear-gradient(90deg,#70008A,#A21CC0)]" style={{ width: `${Math.max(4, completeness.percent)}%` }} />
      </span>
      <p className="ap-sm mt-2">
        {left ? `${left} more item${left === 1 ? "" : "s"} to complete.` : "Your profile is complete."}
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col p-0">
        {completeness.items.map((it) => (
          <li key={it.label}>
            <button
              type="button"
              disabled={it.done}
              onClick={() => onOpen(targetFor(it.label))}
              className={`flex min-h-11 w-full items-center gap-2.5 text-left text-[15px] ${it.done ? "text-(--ap-muted)" : "font-semibold text-(--ap-ink) hover:text-(--ap-violet)"}`}
            >
              <span className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${it.done ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white"}`}>
                {it.done ? <Check className="size-2.5" strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              {it.label}
            </button>
          </li>
        ))}
      </ul>
      {first ? (
        <button type="button" onClick={() => onOpen(targetFor(first))} className="ap-btn ap-btn-p mt-3 w-full">
          Complete profile <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <p className="mt-2.5 text-[13px] leading-snug text-(--ap-muted)">Profile completion is separate from your application status. It only helps employers see your full background.</p>
    </aside>
  );
}

/** Section bar: picking one switches the content below (no scrolling). */
export function SectionNav({ items, active, onGo }: { items: readonly (readonly [string, string])[]; active: string; onGo: (id: string) => void }) {
  return (
    <nav aria-label="Profile sections" className="sticky top-[88px] z-10 -mx-1 mb-5 hidden bg-(--ap-bg) px-1 min-[768px]:block">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto border-b border-(--ap-line) p-0 [scrollbar-width:none]">
        {items.map(([id, label]) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onGo(id);
              }}
              className={`-mb-px inline-flex h-12 items-center border-b-[3px] px-4 text-[15px] ${active === id ? "border-(--ap-violet) font-bold text-(--ap-violet)!" : "border-transparent font-semibold text-(--ap-ink-2)! hover:text-(--ap-violet)!"}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Three real numbers from the saved profile: time in listed roles, roles, skills. */
export function CareerHighlights({ profile }: { profile: ApplicantProfile }) {
  const months = profile.employmentHistory.reduce((sum, e) => sum + monthsInPeriod(e.period), 0);
  const skills = Object.values(profile.skills).reduce((n, s) => n + s.length, 0);
  const stats = [
    { icon: BriefcaseBusiness, value: formatYears(months), label: "In listed roles" },
    { icon: UserRound, value: String(profile.employmentHistory.length), label: "Previous roles" },
    { icon: Sparkles, value: String(skills), label: "Skills" },
  ];
  return (
    <section className="ap-card hidden rounded-[20px] p-5 min-[768px]:block" aria-label="Career highlights">
      <h2 className="ap-serif mb-3 text-[25px]">Career highlights</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {stats.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-(--ap-line-2)" : "pt-0"}`}>
            <IconTile icon={s.icon} className="size-9 rounded-full" iconClassName="size-[18px]" />
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink-2)">{s.label}</span>
            <b className="text-[15px] tabular-nums">{s.value}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Status of the documents the profile depends on, with a link to manage them (no uploads here). */
export function CareerDocuments({ documents, certifications }: { documents: ApplicantDocument[]; certifications: number }) {
  const has = (name: string) => documents.some((d) => d.name === name && d.status !== "action-required");
  const rows: { label: string; ok: boolean; text: string }[] = [
    { label: "CV", ok: has("CV"), text: has("CV") ? "Uploaded" : "Missing" },
    { label: "Passport photograph", ok: has("Passport photograph"), text: has("Passport photograph") ? "Uploaded" : "Missing" },
    { label: "Certifications", ok: certifications > 0, text: certifications > 0 ? `${certifications} listed` : "None yet" },
  ];
  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((r, i) => (
          <li key={r.label} className={`flex items-center justify-between gap-3 py-2.5 ${i > 0 ? "border-t border-(--ap-line-2)" : "pt-0"}`}>
            <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold">
              <IconTile icon={r.label === "Certifications" ? Award : FileText} className="size-8 rounded-[10px]" iconClassName="size-4" />
              {r.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-[14px] ${r.ok ? "font-semibold text-(--ap-ok)" : "text-(--ap-muted)"}`}>
              {r.ok ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : null}
              {r.text}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/applicant/documents" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold">
        View documents <ArrowRight className="size-[15px]" aria-hidden="true" />
      </Link>
    </>
  );
}
