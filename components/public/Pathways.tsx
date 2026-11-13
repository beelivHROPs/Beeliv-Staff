import { PATHWAYS } from "@/lib/public-site/content";
import { LiftCard, Reveal, TextLink } from "./kit";
import { Eyebrow, T, stagger } from "./primitives";
import { SlotImage } from "./SlotImage";

/** 04 Audience pathways: two cards, professionals then businesses. */
export function Pathways() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[calc(1440*var(--u))] gap-5 px-5 py-[60px] wf-d:grid-cols-2 wf-d:gap-8 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
        {PATHWAYS.map((p, i) => (
          <Reveal key={p.eyebrow} delay={stagger(i)} className="h-full">
            <LiftCard className="ps-cd flex h-full flex-col overflow-hidden">
              <SlotImage
                slot={p.image}
                className="h-[250px] !border-0 wf-d:h-[calc(420*var(--u))]"
                hoverZoom
                sizes="(min-width: 820px) 45vw, 100vw"
              />
              <div className="flex flex-col gap-3.5 px-6 pt-7 pb-8 wf-d:gap-5 wf-d:px-[calc(44*var(--u))] wf-d:pt-[calc(44*var(--u))] wf-d:pb-[calc(48*var(--u))]">
                <Eyebrow>{p.eyebrow}</Eyebrow>
                <h3 className="ps-serif [--fs-d:53]">
                  <T>{p.headlineDesktop[0]}</T>
                  <br className="hidden wf-d:inline" />{" "}
                  <T>{p.headlineDesktop[1]}</T>
                </h3>
                <p className="ps-bd">
                  <T>{p.body}</T>
                </p>
                <TextLink href={p.link.href} label={p.link.label} />
              </div>
            </LiftCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
