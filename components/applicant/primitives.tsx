import type { ReactNode } from "react";
import { EmptyArt, artFor, type ArtKind } from "./EmptyArt";
import { GlassIcon, glassForIcon, type GlassName } from "@/components/shared/icons";
import Image from "next/image";
import Link from "next/link";
import { sectionTitleClass } from "./SectionCard";
import { ArrowRight, Briefcase, ChefHat, ConciergeBell, LifeBuoy, UsersRound, Wine, type LucideIcon } from "@/components/applicant/icons";

/** Deterministic colour pick for a company's initials logo (mirrors the wireframe's monoColor()). */
// Brand-only palette (project lead: too many colours). Three violet depths, picked by name so a company keeps its tint.
const MONO_PAIRS = [
  ["#F6EEF9", "#5B087B"],
  ["#EDE0F5", "#4A0668"],
  ["#F3E8F8", "#70008A"],
] as const;

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const words = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

export function CompanyLogo({ name, size = 56 }: { name: string; size?: number }) {
  const [bg, fg] = MONO_PAIRS[hashString(name) % MONO_PAIRS.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[14px] font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

export { Avatar } from "./Avatar";

const CHIP_TONE = {
  warn: "ap-chip-warn",
  ok: "ap-chip-ok",
  info: "ap-chip-info",
  violet: "ap-chip-violet",
  mute: "ap-chip-mute",
} as const;

export function Chip({
  tone = "mute",
  icon: Icon,
  children,
}: {
  tone?: keyof typeof CHIP_TONE;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className={`ap-chip ${CHIP_TONE[tone]}`}>
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="ap-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  art,
  glass,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Optional: choose the picture explicitly (see EmptyArt.tsx). Otherwise it follows the icon. */
  art?: ArtKind;
  /** Opt-in (Applicant and Staff): the glass hero icon instead of the line picture. */
  glass?: GlassName;
}) {
  const g = glass ?? glassForIcon(Icon, title);
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
      {g ? <GlassIcon name={g} size={96} className="mb-1" /> : <EmptyArt kind={art ?? artFor(Icon)} className="mb-1 h-[96px] w-[120px]" />}
      <b className="text-[18px] leading-snug">{title}</b>
      <p className="max-w-[36ch] text-[15px] leading-snug text-(--ap-muted)">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/**
 * Page title scale (one h1 per page):
 * - PAGE_TITLE   list/index pages - 30 / 44 / 44px (phone / tablet / desktop)
 * - DETAIL_TITLE a record's own page, h1 inside its header card (job, application,
 *                offer, profile, Staff Hub) - 30 / 40 / 44px
 * Section titles (h2) come from sectionTitleClass() in ./SectionCard.
 */
export const PAGE_TITLE = "ap-serif text-[30px] min-[768px]:text-[34px] min-[1101px]:text-[36px]";
export const DETAIL_TITLE = "ap-serif text-[30px] min-[768px]:text-[40px] min-[1101px]:text-[38px]";

/** Card header row: section h2 (sectionTitleClass) + optional "View all" link. `aside` = narrow side-column card. */
export function SectionHeading({
  title,
  moreHref,
  moreLabel = "View all",
  aside = false,
}: {
  title: string;
  moreHref?: string;
  moreLabel?: string;
  aside?: boolean;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <h2 className={sectionTitleClass(aside)}>{title}</h2>
      {moreHref ? (
        <Link
          href={moreHref}
          className="ap-hit inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)"
        >
          {moreLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** Index-page heading block: h1 + muted subtitle, 12px above / 20px below (then the first card). */
export function PageHeading({ title, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-3 pb-5 max-[767px]:items-center max-[767px]:gap-3 max-[767px]:pb-3">
      <div className="min-w-0">
        <h1 className={`${PAGE_TITLE} ap-pagehead-title max-[767px]:text-[28px]`}>{title}</h1>
        {/* No subtitle line: the title says what the page is (project lead). The prop stays so callers compile. */}
      </div>
      {right}
    </div>
  );
}

/* Wireframe DEPT_ART: gradient + dot-pattern tile with the department's Lucide glyph. */
const DEPT_ART: Record<string, { icon: LucideIcon; from: string; to: string; ink: string }> = {
  "Front of house": { icon: ConciergeBell, from: "#F6EEF9", to: "#E8D6F1", ink: "#5B087B" },
  Kitchen: { icon: ChefHat, from: "#F3E8F8", to: "#E3CFEE", ink: "#4A0668" },
  Bar: { icon: Wine, from: "#F6EEF9", to: "#E8D6F1", ink: "#5B087B" },
  Management: { icon: UsersRound, from: "#EFEAF7", to: "#DCD1EE", ink: "#3F2A78" },
  "Admin & operations": { icon: Briefcase, from: "#F3E8F8", to: "#E3CFEE", ink: "#4A0668" },
  Support: { icon: LifeBuoy, from: "#F6EEF9", to: "#E8D6F1", ink: "#5B087B" },
};

/** Job/company thumbnail: the job's photo, or the wireframe's department art when it has none. */
export function JobThumb({
  image,
  department,
  size = 52,
  radius = 12,
}: {
  image: { src: string; alt: string } | null;
  department: string;
  size?: number;
  radius?: number;
}) {
  if (image) {
    return (
      <span className="relative shrink-0 overflow-hidden bg-(--ap-line-2)" style={{ width: size, height: size, borderRadius: radius }}>
        <Image src={image.src} alt={image.alt} fill className="ap-zoom object-cover" sizes={`${size * 2}px`} />
      </span>
    );
  }
  const art = DEPT_ART[department] ?? DEPT_ART["Front of house"];
  const Icon = art.icon;
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `radial-gradient(${art.ink}1f 1px, transparent 1.2px) 0 0 / 8px 8px, linear-gradient(135deg, ${art.from}, ${art.to})`,
        color: art.ink,
      }}
    >
      <span className="absolute -top-[10%] -right-[10%] size-1/2 rounded-full bg-white/35" />
      <Icon className="relative" style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={1.4} />
    </span>
  );
}

/** Full-width cover (public home-page job card style): photo, or department art when there is none. */
export function JobCover({ image, department, className }: { image: { src: string; alt: string } | null; department: string; className?: string }) {
  if (image) {
    return (
      <span className={`relative block overflow-hidden bg-(--ap-line-2) ${className ?? ""}`}>
        <Image src={image.src} alt={image.alt} fill className="ap-zoom object-cover" sizes="(min-width: 900px) 25vw, (min-width: 641px) 45vw, 80vw" />
      </span>
    );
  }
  const art = DEPT_ART[department] ?? DEPT_ART["Front of house"];
  const Icon = art.icon;
  return (
    <span
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{ background: `radial-gradient(${art.ink}1f 1px, transparent 1.2px) 0 0 / 10px 10px, linear-gradient(135deg, ${art.from}, ${art.to})`, color: art.ink }}
    >
      <span className="absolute -top-6 -right-6 size-28 rounded-full bg-white/35" />
      <Icon className="relative size-12" strokeWidth={1.4} />
    </span>
  );
}
