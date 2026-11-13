import { BUSINESS_TIMELINE } from "@/lib/public-site/business-content";
import { Btn, Reveal } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";

type StepIconProps = { className?: string };

function UnderstandIcon({ className }: StepIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="var(--antique-gold)" />
      <path d="M15.5 15.5 21 21" stroke="var(--antique-gold)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DesignIcon({ className }: StepIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 22 7l-10 5L2 7z" fill="var(--antique-gold)" />
      <path d="M2 12l10 5 10-5" stroke="var(--antique-gold)" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="var(--antique-gold)" strokeWidth="2.4" fill="none" strokeLinejoin="round" opacity=".6" />
    </svg>
  );
}

function DevelopIcon({ className }: StepIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 1 9l11 6 11-6z" fill="var(--antique-gold)" />
      <path d="M5 12v5c3.5 3 10.5 3 14 0v-5l-7 4z" fill="var(--antique-gold)" opacity=".7" />
    </svg>
  );
}

function ImproveIcon({ className }: StepIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="13" width="5" height="8" rx="1.5" fill="var(--antique-gold)" opacity=".6" />
      <rect x="9.5" y="8" width="5" height="13" rx="1.5" fill="var(--antique-gold)" opacity=".8" />
      <rect x="16" y="3" width="5" height="18" rx="1.5" fill="var(--antique-gold)" />
    </svg>
  );
}

const STEP_ICONS = [UnderstandIcon, DesignIcon, DevelopIcon, ImproveIcon];

/**
 * "How it works" (Business-*.dc.html "HOW IT WORKS · CARDS" - prototype
 * revision replacing the earlier connected-line "TIMELINE" version this
 * section used to match). A rounded Deep-Plum card floating inside the page
 * (not full-bleed), holding four "glass" step cards: gradient-on-dark panel,
 * step number top-right, gold glyph icon, and a "You get:" line pinned to
 * the bottom of the card via `margin-top: auto`. Desktop: 4-column grid.
 * Mobile: stacked list, same card styling.
 */
export function Timeline() {
  return (
    <section className="relative m-3 flex flex-col gap-5 overflow-hidden rounded-[28px] bg-(--deep-plum) p-[56px_18px] text-white wf-d:m-6 wf-d:gap-14 wf-d:rounded-[32px] wf-d:p-[100px_72px]">
      <Reveal className="flex flex-col gap-3 wf-d:grid wf-d:grid-cols-2 wf-d:items-end wf-d:gap-[calc(96*var(--u))]">
        <div className="flex flex-col gap-3 wf-d:gap-[18px]">
          <Eyebrow className="!text-(--antique-gold)">{BUSINESS_TIMELINE.eyebrow}</Eyebrow>
          <h2 className="ps-serif text-white [--fs-d:53] [--fs-m:30]">
            <T>{BUSINESS_TIMELINE.headlineLead}</T>{" "}
            <span className="text-(--antique-gold)">
              <T>{BUSINESS_TIMELINE.headlineAccent}</T>
            </span>
          </h2>
        </div>
        <p className="text-[17px] leading-[1.6] text-white/80 wf-d:max-w-[44ch] wf-d:text-[18px]">
          <T>{BUSINESS_TIMELINE.body}</T>
        </p>
      </Reveal>

      <ol className="relative m-0 flex list-none flex-col gap-3.5 p-0 wf-d:grid wf-d:grid-cols-4 wf-d:gap-5">
        {BUSINESS_TIMELINE.steps.map((s, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <Reveal
              as="li"
              key={s.name}
              delay={stagger(i)}
              className="relative flex flex-col gap-3.5 rounded-[24px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.03))] p-[26px_22px_22px] transition-[background,border-color,transform] duration-200 hover:border-[rgba(201,164,92,.5)] hover:bg-white/10 hover:-translate-y-[3px] wf-d:min-h-[340px] wf-d:gap-4 wf-d:p-[32px_28px_28px]"
            >
              <span className="absolute top-5 right-5 text-sm font-bold tracking-[.12em] text-(--antique-gold) wf-d:top-[22px] wf-d:right-6">
                {s.num}
              </span>
              <Icon className="h-8 w-8 wf-d:h-9 wf-d:w-9" />
              <h3 className="mt-1 text-[21px] font-bold leading-[1.25] text-white wf-d:mt-2 wf-d:text-[22px]">
                <T>{s.name}</T>
              </h3>
              <p className="text-[17px] leading-[1.55] text-white/80 wf-d:text-[16px] wf-d:leading-[1.6]">
                <T>{s.text}</T>
              </p>
              <span className="mt-auto border-t border-[rgba(201,164,92,.3)] pt-3.5 text-[15px] text-(--antique-gold) wf-d:text-sm">
                <b>You get:</b> <T>{s.getValue}</T>
              </span>
            </Reveal>
          );
        })}
      </ol>

      <Reveal delay={0.4}>
        <Btn href={BUSINESS_TIMELINE.cta.href} label={BUSINESS_TIMELINE.cta.label} variant="bw" />
      </Reveal>
    </section>
  );
}
