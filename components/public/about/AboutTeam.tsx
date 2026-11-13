import { ABOUT_TEAM } from "@/lib/public-site/about-content";
import { Reveal } from "../kit";
import { Eyebrow, T, stagger } from "../primitives";
import { SlotImage } from "../SlotImage";

/**
 * "MEET OUR TEAM" - two portrait cards. The wireframe's own dev-note next to
 * the desktop heading ("Portraits from profile booklet · full surnames if
 * they agree") is a `.tg` design-tool annotation, same as the "IMG ·"
 * placeholder tags elsewhere, so it is not rendered as page copy - see the
 * file header comment in lib/public-site/about-content.ts.
 */
export function AboutTeam() {
  return (
    <section className="bg-(--warm-white)">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-5 px-5 pt-2 pb-16 wf-d:gap-10 wf-d:px-[calc(96*var(--u))] wf-d:pb-[calc(120*var(--u))]">
        <Reveal className="flex flex-col gap-3 wf-d:gap-[18px]">
          <Eyebrow>{ABOUT_TEAM.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
            <T>{ABOUT_TEAM.headline}</T>
          </h2>
        </Reveal>
        <div className="flex flex-col gap-5 wf-d:grid wf-d:grid-cols-2 wf-d:gap-8">
          {ABOUT_TEAM.members.map((m, i) => (
            <Reveal
              key={m.name}
              delay={stagger(i)}
              className="ps-cd flex flex-col gap-3 p-5 wf-d:grid wf-d:grid-cols-[calc(240*var(--u))_minmax(0,1fr)] wf-d:items-start wf-d:gap-8 wf-d:p-7"
            >
              <SlotImage
                slot={m.slot}
                className="ab-portrait h-[320px] wf-d:h-[calc(360*var(--u))]"
                sizes="(min-width: 820px) 240px, 60vw"
              />
              <div className="flex flex-col gap-3 wf-d:pt-2">
                <h3 className="ps-serif [--fs-d:35] [--fs-m:30]">
                  <T>{m.name}</T>
                </h3>
                <div className="ps-eb !text-[11px] !text-(--beeliv-purple)">
                  <T>{m.role}</T>
                </div>
                <p className="ps-sm hidden wf-d:block">
                  <T>{m.bio}</T>
                </p>
                <p className="ps-sm wf-d:hidden">
                  <T>{m.bioMobile}</T>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
