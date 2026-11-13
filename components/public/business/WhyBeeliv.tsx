import { BUSINESS_WHY } from "@/lib/public-site/business-content";
import { Reveal } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";

/**
 * "Why Beeliv" (Business-*.dc.html "WHY BEELIV"): narrow eyebrow/headline
 * column + a 3-column (2-row) grid of six reasons, each a hairline-topped
 * block. Mobile: eyebrow/headline then the six reasons stacked in one column.
 */
export function WhyBeeliv() {
  return (
    <section className="flex flex-col gap-8 bg-white px-5 py-16 wf-d:grid wf-d:grid-cols-[380px_minmax(0,1fr)] wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]">
      <Reveal className="flex flex-col gap-3 wf-d:gap-[18px]">
        <Eyebrow>{BUSINESS_WHY.eyebrow}</Eyebrow>
        <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
          <T>{BUSINESS_WHY.headlineLead}</T>{" "}
          <span className="ps-hl-b">
            <T>{BUSINESS_WHY.headlineAccent}</T>
          </span>
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-6 wf-d:grid-cols-3 wf-d:gap-x-10 wf-d:gap-y-10">
        {BUSINESS_WHY.reasons.map((r, i) => (
          <Reveal
            key={r.title}
            delay={stagger(i)}
            className="flex flex-col gap-1.5 border-t border-(--ink) pt-3.5 wf-d:pt-5"
          >
            <h3 className="ps-serif [--fs-d:29] [--fs-m:25]">
              <T>{r.title}</T>
            </h3>
            <p className="text-[16px] leading-[1.55] text-(--muted-text) wf-d:text-sm">
              <T>{r.body}</T>
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
