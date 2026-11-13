import { Fragment } from "react";
import { PILLARS, PILLARS_LINK } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";
import { Reveal, TextLink } from "./kit";
import { Chip, T, stagger } from "./primitives";

/**
 * 05 People / Systems / Service.
 * Desktop: three columns divided by hairlines. Mobile: stacked with hairlines
 * between. Each pillar has an id so the hero indicator can scroll to it.
 */
export function Pillars() {
  return (
    <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-7 px-5 pt-[72px] pb-16 wf-d:gap-[calc(64*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(140*var(--u))] wf-d:pb-[calc(130*var(--u))]">
      <div className="grid gap-7 wf-d:grid-cols-3 wf-d:gap-0">
        {PILLARS.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <div className="ps-hr wf-d:hidden" />}
            <Reveal
              delay={stagger(i)}
              id={p.id}
              className={cn(
                "flex scroll-mt-24 flex-col gap-2.5 wf-d:gap-[18px] wf-d:py-2",
                i === 0 && "wf-d:pr-[calc(48*var(--u))]",
                i === 1 && "wf-d:border-l wf-d:border-(--soft-border) wf-d:px-[calc(48*var(--u))]",
                i === 2 && "wf-d:border-l wf-d:border-(--soft-border) wf-d:pl-[calc(48*var(--u))]",
              )}
            >
              <div className="text-[13px] tracking-[.06em] text-(--beeliv-purple) tabular-nums">
                <T>{p.num}</T>
              </div>
              <div className="ps-eb !text-[12px] !text-(--beeliv-purple)">
                <T>{p.label}</T>
              </div>
              <h3 className="ps-serif [--fs-d:37]">
                <T>{p.title}</T>
              </h3>
              <p className="ps-bd">
                <T>{p.body}</T>
              </p>
              <div className="flex flex-wrap gap-1.5 wf-d:gap-2">
                {p.chips.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </Reveal>
          </Fragment>
        ))}
      </div>
      <Reveal className="mt-2 flex wf-d:mt-0">
        <TextLink href={PILLARS_LINK.href} label={PILLARS_LINK.label} />
      </Reveal>
    </section>
  );
}
