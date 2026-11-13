import { cn } from "@/lib/utils";
import { ABOUT_VISION_MISSION } from "@/lib/public-site/about-content";
import { Reveal } from "../kit";
import { Eyebrow, T, stagger } from "../primitives";

/**
 * "VISION + MISSION" - deep-plum band. Desktop: 1.25fr/1fr grid, mission list
 * closed top and bottom. Mobile: stacked, mission list only has top rules.
 */
export function AboutVisionMission() {
  const { visionEyebrow, vision, missionEyebrow, mission } = ABOUT_VISION_MISSION;
  return (
    <section className="bg-(--deep-plum) text-white">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-[18px] px-5 py-[72px] wf-d:grid wf-d:grid-cols-[1.25fr_1fr] wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(130*var(--u))]">
        <Reveal className="flex flex-col gap-4 wf-d:gap-7">
          <Eyebrow className="!text-(--antique-gold)">{visionEyebrow}</Eyebrow>
          <p className="ps-serif [--fs-d:53] [--fs-m:30]">
            <T>{vision}</T>
          </p>
        </Reveal>
        <Reveal delay={stagger(1)} className="flex flex-col gap-[18px] pt-[18px] wf-d:gap-[22px] wf-d:pt-1">
          <Eyebrow className="!text-(--antique-gold)">{missionEyebrow}</Eyebrow>
          <ul className="flex flex-col text-[15px] leading-[1.5] text-white/85 wf-d:text-[17px]">
            {mission.map((item, i) => (
              <li
                key={item}
                className={cn(
                  "border-t border-white/[.14] py-3 wf-d:py-4",
                  i === mission.length - 1 && "wf-d:border-b",
                )}
              >
                <T>{item}</T>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
