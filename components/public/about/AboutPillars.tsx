import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { ABOUT_PILLARS } from "@/lib/public-site/about-content";
import { Reveal } from "../kit";
import { Eyebrow, T, stagger } from "../primitives";

/**
 * "PEOPLE / SYSTEMS / SERVICE" - three columns. Desktop shows the body copy;
 * mobile drops it and shows only the eyebrow + title (About-Mobile.dc.html
 * "P / S / S" section has no body paragraphs, unlike Home's Pillars).
 */
export function AboutPillars() {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-6 px-5 py-16 wf-d:grid wf-d:grid-cols-3 wf-d:gap-0 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]">
        {ABOUT_PILLARS.map((p, i) => (
          <Fragment key={p.eyebrow}>
            {i > 0 && <div className="ps-hr wf-d:hidden" />}
            <Reveal
              delay={stagger(i)}
              className={cn(
                "flex flex-col gap-2 wf-d:gap-3.5",
                i === 0 && "wf-d:pr-[calc(44*var(--u))]",
                i === 1 && "wf-d:border-l wf-d:border-(--soft-border) wf-d:px-[calc(44*var(--u))]",
                i === 2 && "wf-d:border-l wf-d:border-(--soft-border) wf-d:pl-[calc(44*var(--u))]",
              )}
            >
              <Eyebrow className="!text-(--beeliv-purple)">{p.eyebrow}</Eyebrow>
              <h3 className="ps-serif [--fs-d:35] [--fs-m:30]">
                <T>{p.title}</T>
              </h3>
              <p className="ps-bd hidden text-base wf-d:block">
                <T>{p.body}</T>
              </p>
            </Reveal>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
