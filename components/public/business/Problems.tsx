import { BUSINESS_PROBLEMS } from "@/lib/public-site/business-content";
import { Reveal } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";

/**
 * "The challenge" (Business-*.dc.html "BUSINESS PROBLEMS"): four pain-point
 * cards, each tagged with the practice area that addresses it. The
 * wireframe's own `.tg` note after the headline ("Researched Nigerian pain
 * points ... confirm wording with client") is a design annotation, not page
 * copy - see business-content.ts header comment.
 */
export function Problems() {
  return (
    <section className="flex flex-col gap-8 bg-white px-5 py-16 wf-d:gap-12 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
      <Reveal className="flex flex-col gap-3 wf-d:gap-[18px]">
        <Eyebrow>{BUSINESS_PROBLEMS.eyebrow}</Eyebrow>
        <h2 className="ps-serif max-w-none [--fs-d:53] [--fs-m:30] wf-d:max-w-[22ch]">
          <T>{BUSINESS_PROBLEMS.headlineLead}</T>{" "}
          <span className="ps-hl-b">
            <T>{BUSINESS_PROBLEMS.headlineAccent}</T>
          </span>
        </h2>
      </Reveal>

      <div className="grid grid-cols-1 gap-3 wf-d:grid-cols-4 wf-d:gap-5">
        {BUSINESS_PROBLEMS.cards.map((c, i) => (
          <Reveal key={c.title} delay={stagger(i)} className="ps-cd flex flex-col gap-3 p-5 wf-d:p-7">
            <h3 className="ps-serif [--fs-d:28] [--fs-m:23]">
              <T>{c.title}</T>
            </h3>
            <p className="text-[16px] leading-[1.55] text-(--muted-text) wf-d:text-sm">
              <T>{c.body}</T>
            </p>
            <span className="mt-auto self-start text-[12px] font-bold tracking-[.12em] text-(--deep-gold) uppercase">
              <T>{c.tag}</T>
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
