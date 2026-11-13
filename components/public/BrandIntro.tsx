import { BRAND_INTRO } from "@/lib/public-site/content";
import { HotelIcon } from "./icons";
import { Reveal, TextLink } from "./kit";
import { Eyebrow, T } from "./primitives";
import { SlotImage } from "./SlotImage";

/**
 * 03 Brand introduction.
 * Desktop: text left (560), dining-table photo bleeding off the right edge with
 * the sculptural curve, purple "Hospitality people" badge straddling the join.
 * Mobile: white band, text then photo (bleeding right) with the badge tucked
 * over the photo's top-right.
 */
export function BrandIntro() {
  return (
    <section id="brand-intro" className="scroll-mt-4 bg-white wf-d:bg-transparent">
      <div className="relative mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-16 pt-12 pb-[52px] wf-d:grid wf-d:grid-cols-[calc(560*var(--u))_minmax(0,1fr)] wf-d:items-center wf-d:gap-[calc(96*var(--u))] wf-d:pt-[calc(150*var(--u))] wf-d:pr-0 wf-d:pb-[calc(140*var(--u))] wf-d:pl-[calc(96*var(--u))]">
        <Reveal className="flex flex-col gap-3.5 px-5 pt-3 wf-d:gap-7 wf-d:p-0">
          <Eyebrow>{BRAND_INTRO.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:56]">
            <T>{BRAND_INTRO.headlineLead}</T>{" "}
            <span className="ps-hl-b">
              <T>{BRAND_INTRO.headlineAccent}</T>
            </span>
          </h2>
          <p className="ps-bd">
            <T>{BRAND_INTRO.body}</T>
          </p>
          <TextLink
            href={BRAND_INTRO.link.href}
            label={BRAND_INTRO.link.label}
            className="!border-0 !text-base wf-d:!border-b wf-d:!text-[15px]"
          />
        </Reveal>

        <div className="relative ml-5 wf-d:static wf-d:ml-0 wf-d:mr-[calc(var(--bleed)*-1)]">
          <SlotImage
            slot="brandDining"
            className="ps-sculpt h-[380px] !border-r-0 wf-d:h-[calc(600*var(--u))]"
            unveil
            parallax={28}
            sizes="(min-width: 820px) 60vw, 100vw"
          />

          {/* Badge: tucked over the photo's top-right (mobile) / straddling the
              text-photo join (desktop, positioned against the 1440 column). */}
          <Reveal
            y={16}
            className="absolute -top-11 right-6 z-[3] flex h-[104px] w-[104px] flex-col items-center justify-center gap-[5px] rounded-full bg-(--beeliv-purple) text-center text-[9.5px] leading-[1.4] font-bold tracking-[.12em] text-white shadow-[0_0_0_5px_#fff,0_0_0_6.5px_#C9A45C] wf-d:top-[calc(250*var(--u))] wf-d:right-auto wf-d:left-[calc(1010*var(--u))] wf-d:h-[calc(168*var(--u))] wf-d:w-[calc(168*var(--u))] wf-d:gap-2 wf-d:text-[max(9.5px,calc(12*var(--u)))] wf-d:leading-[1.45] wf-d:tracking-[.14em] wf-d:shadow-[0_0_0_6px_#FAF9F7,0_0_0_7.5px_#C9A45C]"
          >
            <HotelIcon size={22} strokeWidth={1.5} className="h-5 w-5 text-white wf-d:h-[max(22px,calc(30*var(--u)))] wf-d:w-[max(22px,calc(30*var(--u)))]" />
            <span>
              {BRAND_INTRO.badge.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  <T>{line}</T>
                </span>
              ))}
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
