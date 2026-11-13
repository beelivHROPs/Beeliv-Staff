import { ABOUT_STORY } from "@/lib/public-site/about-content";
import { Reveal } from "../kit";
import { Eyebrow, T } from "../primitives";
import { SlotImage } from "../SlotImage";

/**
 * "THE BEELIV STORY" heading + the story photo/copy pair.
 *
 * The photo/text order differs between boards (About-Mobile stacks heading,
 * then a full-width photo, then the copy as three separate blocks; About-
 * Desktop merges the photo and copy into one 700/1fr grid next to the
 * heading), so - same technique as components/public/Editorial.tsx - this
 * renders two full blocks and toggles them with `hidden`/`wf-d:hidden` rather
 * than trying to reorder one shared layout.
 */
function Quote() {
  return (
    <blockquote className="mt-1 flex flex-col gap-2 border-l-2 border-(--antique-gold) pl-4 wf-d:mt-2 wf-d:pl-5">
      <p className="ps-serif text-[25px] leading-[1.2] wf-d:text-[26px]">
        <T>{ABOUT_STORY.quote}</T>
      </p>
      <span className="ps-eb hidden !text-[11px] wf-d:inline">
        <T>{ABOUT_STORY.quoteLabel}</T>
      </span>
    </blockquote>
  );
}

function Copy() {
  return (
    <>
      <p className="text-[19px] leading-[1.5] wf-d:text-[22px]">
        <T>{ABOUT_STORY.lead}</T>
      </p>
      <p className="ps-bd">
        <T>{ABOUT_STORY.body1}</T>
      </p>
      <p className="ps-bd">
        <T>{ABOUT_STORY.body2Lead}</T>{" "}
        <span className="hidden wf-d:inline">
          <T>{ABOUT_STORY.body2MiddleClauseDesktopOnly}</T>{" "}
        </span>
        <T>{ABOUT_STORY.body2Tail}</T>{" "}
        <b className="!text-(--ink)">
          <T>{ABOUT_STORY.body2Bold}</T>
        </b>
      </p>
      <Quote />
    </>
  );
}

export function AboutStory() {
  const headline = (
    <>
      <T>{ABOUT_STORY.headlineLead}</T>{" "}
      <span className="ps-hl-b">
        <T>{ABOUT_STORY.headlineAccent}</T>
      </span>
    </>
  );

  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-4 px-5 pt-11 pb-9 wf-d:gap-6 wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(110*var(--u))] wf-d:pb-[calc(80*var(--u))]">
        <Reveal when="mount">
          <Eyebrow>{ABOUT_STORY.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal when="mount" delay={0.08}>
          <h1 className="ps-serif max-w-[14ch] [--fs-d:67] [--fs-m:30]">{headline}</h1>
        </Reveal>
      </div>

      {/* Desktop: photo bleeding to the true left edge | copy, 700/1fr grid. */}
      <div className="mx-auto hidden max-w-[calc(1440*var(--u))] wf-d:grid wf-d:grid-cols-[calc(700*var(--u))_minmax(0,1fr)] wf-d:items-start wf-d:gap-[calc(96*var(--u))] wf-d:pr-[calc(96*var(--u))] wf-d:pb-[calc(120*var(--u))]">
        <SlotImage
          slot="aboutStory"
          className="ab-sculpt-l ml-[calc(var(--bleed)*-1)] !border-l-0"
          style={{ height: "calc(620*var(--u))" }}
          unveil
          parallax={28}
          sizes="50vw"
        />
        <Reveal className="flex flex-col gap-[22px] pt-6">
          <Copy />
        </Reveal>
      </div>

      {/* Mobile: heading above, then a full-bleed-left photo, then the copy. */}
      <div className="wf-d:hidden">
        <SlotImage slot="aboutStory" className="ab-sculpt-l mr-10 h-[320px] !border-l-0" unveil sizes="100vw" />
        <div className="flex flex-col gap-4 px-5 pt-9 pb-16">
          <Copy />
        </div>
      </div>
    </section>
  );
}
