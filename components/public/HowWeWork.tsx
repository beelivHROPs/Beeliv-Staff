import { HOW_WE_WORK } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";
import { Btn, Reveal } from "./kit";
import { Eyebrow, T, stagger } from "./primitives";
import { StepBar } from "./StepBar";

/** Mobile staircase indent (Home-Mobile.dc.html: 0 / 16 / 32 / 48). */
const MOBILE_INDENT = ["max-wf-d:ml-0", "max-wf-d:ml-4", "max-wf-d:ml-8", "max-wf-d:ml-12"];
/** Desktop staircase drop before each stage's bar (Main.dc.html: 28 / 104 / 180 / 256). */
const DESKTOP_DROP = ["wf-d:h-[28px]", "wf-d:h-[104px]", "wf-d:h-[180px]", "wf-d:h-[256px]"];
/** Later columns sit underneath earlier columns' overhanging bars. */
const DESKTOP_Z = ["wf-d:z-[4]", "wf-d:z-[3]", "wf-d:z-[2]", "wf-d:z-[1]"];

/**
 * 06 How we work: four numbered stages.
 * Desktop: four columns stepping down like a staircase, each with a bar that
 * overhangs into the next column. Mobile: a stacked list with the same
 * staircase as a left indent.
 */
export function HowWeWork() {
  return (
    <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-5 px-5 py-16 wf-d:gap-[calc(64*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
      <Reveal className="flex flex-col gap-5 wf-d:grid wf-d:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] wf-d:items-end wf-d:gap-[calc(96*var(--u))]">
        <div className="flex flex-col gap-5 wf-d:gap-[18px]">
          <Eyebrow className="!text-[12px]">{HOW_WE_WORK.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:56]">
            <T>{HOW_WE_WORK.headlineLead}</T>{" "}
            <span className="ps-hl-b">
              <T>{HOW_WE_WORK.headlineAccent}</T>
            </span>
          </h2>
        </div>
        <p className="ps-bd">
          <T>{HOW_WE_WORK.body}</T>
        </p>
      </Reveal>

      <ol className="m-0 mt-2 flex list-none flex-col gap-[26px] p-0 wf-d:mt-0 wf-d:grid wf-d:grid-cols-4 wf-d:gap-0 wf-d:border-r wf-d:border-(--soft-border)">
        {HOW_WE_WORK.steps.map((s, i) => {
          const last = i === HOW_WE_WORK.steps.length - 1;
          return (
            <Reveal
              as="li"
              key={s.name}
              delay={stagger(i)}
              className={cn(
                "flex flex-col gap-2.5 wf-d:relative wf-d:gap-0 wf-d:border-l wf-d:border-(--soft-border)",
                MOBILE_INDENT[i],
                DESKTOP_Z[i],
              )}
            >
              <span className="text-[11px] font-semibold tracking-[.14em] text-(--muted-text) uppercase wf-d:px-5 wf-d:text-xs wf-d:tracking-[.16em]">
                <T>{s.question}</T>
              </span>
              <div className={cn("hidden wf-d:block", DESKTOP_DROP[i])} aria-hidden="true" />
              <StepBar name={s.name} num={s.num} last={last} />
              <div className="flex flex-col gap-2.5 wf-d:gap-3 wf-d:px-5 wf-d:pt-[18px]">
                <p className="ps-sm">
                  <T>{s.text}</T>
                </p>
                <div className="text-[13px] font-semibold text-(--beeliv-purple)">
                  <T>{s.get}</T>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>

      <Reveal className="mt-2 flex flex-col gap-5 wf-d:mt-0 wf-d:flex-row wf-d:items-center wf-d:gap-6 wf-d:border-t wf-d:border-(--soft-border) wf-d:pt-8">
        <Btn href={HOW_WE_WORK.cta.href} label={HOW_WE_WORK.cta.label} variant="bp" />
        <span className="text-[13px] text-(--muted-text)">
          <T>{HOW_WE_WORK.auditLine}</T>
        </span>
      </Reveal>
    </section>
  );
}
