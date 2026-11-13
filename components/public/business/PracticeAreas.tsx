import { CheckIcon } from "@/components/public/icons";
import { Reveal, TextLink } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import { PRACTICE_AREAS } from "@/lib/public-site/business-content";

/**
 * "What we offer" (Business-*.dc.html "PRACTICE AREAS · ALL FOUR"): the four
 * practice-area cards (Training, Consulting, Recruitment & HR, Business
 * Development), each with a service/track count chip, checklist and an
 * "Enquire about this" link to /request.
 */
export function PracticeAreas() {
  return (
    <section className="flex flex-col gap-8 px-5 py-16 wf-d:gap-12 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
      <Reveal className="flex flex-col gap-5 wf-d:grid wf-d:grid-cols-2 wf-d:items-end wf-d:gap-[calc(96*var(--u))]">
        <div className="flex flex-col gap-3 wf-d:gap-[18px]">
          <Eyebrow>{PRACTICE_AREAS.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
            <T>{PRACTICE_AREAS.headlineLead}</T>{" "}
            <span className="ps-hl-b">
              <T>{PRACTICE_AREAS.headlineAccent}</T>
            </span>
          </h2>
        </div>
        <p className="ps-bd">
          <T>{PRACTICE_AREAS.body}</T>
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 wf-d:grid-cols-2 wf-d:gap-6">
        {PRACTICE_AREAS.areas.map((a, i) => (
          <Reveal key={a.title} delay={stagger(i)} className="ps-cd flex flex-col gap-4 p-6 wf-d:p-9">
            <div className="flex items-center justify-between gap-3">
              <span className="ps-chip !bg-[rgba(91,8,123,.08)] !text-(--beeliv-purple) font-bold">
                <T>{a.countLabel}</T>
              </span>
              <span className="text-[12px] font-bold tracking-[.16em] text-(--deep-gold) uppercase">
                <T>{a.category}</T>
              </span>
            </div>
            <h3 className="ps-serif [--fs-d:34] [--fs-m:26]">
              <T>{a.title}</T>
            </h3>
            <p className="text-[17px] leading-[1.55] text-(--ink) wf-d:text-[16px]">
              <T>{a.body}</T>
            </p>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-2.5 border-t border-(--soft-border) p-0 pt-4 text-(--muted-text) wf-d:grid-cols-2">
              {a.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[16px] leading-[1.45] wf-d:text-[15px]">
                  <CheckIcon size={16} strokeWidth={2.2} className="mt-[3px] shrink-0" />
                  <span>
                    <T>{item}</T>
                  </span>
                </li>
              ))}
            </ul>
            <TextLink href={PRACTICE_AREAS.enquire.href} label={PRACTICE_AREAS.enquire.label} className="mt-1" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
