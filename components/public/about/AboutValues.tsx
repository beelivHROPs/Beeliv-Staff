import { ABOUT_VALUES } from "@/lib/public-site/about-content";
import { Reveal } from "../kit";
import { Eyebrow, T, stagger } from "../primitives";

/**
 * "WHAT DRIVES US" - six values. Desktop: 340px label column + 3-col grid
 * (2 rows). Mobile: stacked list. Each item's top rule is full ink black
 * (`border-(--ink)`), not the usual soft border - a deliberate stronger
 * divider only used in this section of the wireframe.
 */
export function AboutValues() {
  return (
    <section className="bg-(--warm-white)">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-5 px-5 py-16 wf-d:grid wf-d:grid-cols-[calc(340*var(--u))_minmax(0,1fr)] wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
        <Reveal className="flex flex-col gap-3 wf-d:gap-[18px]">
          <Eyebrow>{ABOUT_VALUES.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
            <T>{ABOUT_VALUES.headline}</T>
          </h2>
        </Reveal>
        <div className="flex flex-col gap-5 wf-d:grid wf-d:grid-cols-3 wf-d:gap-x-10 wf-d:gap-y-11">
          {ABOUT_VALUES.items.map((v, i) => (
            <Reveal
              key={v.title}
              delay={stagger(i)}
              className="flex flex-col gap-1.5 border-t border-(--ink) pt-3.5 wf-d:gap-2.5 wf-d:pt-5"
            >
              <h3 className="ps-serif [--fs-d:29] [--fs-m:25]">
                <T>{v.title}</T>
              </h3>
              <p className="ps-sm">
                <T>{v.body}</T>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
