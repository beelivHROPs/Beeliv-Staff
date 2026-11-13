import { EDITORIAL } from "@/lib/public-site/content";
import { Reveal } from "./kit";
import { T } from "./primitives";
import { SlotImage } from "./SlotImage";

/**
 * 09 Editorial photo collage. Desktop: headline + small photo | large
 * sculpted photo | tall photo, bottom-aligned; the photos drift at different
 * speeds as you scroll. Mobile: headline, one large sculpted photo, then a
 * swipe row where the second photo peeks in.
 */
export function Editorial() {
  const headline = (
    <>
      <T>{EDITORIAL.headlineLead}</T>{" "}
      <span className="ps-hl-b">
        <T>{EDITORIAL.headlineAccent}</T>
      </span>
    </>
  );

  return (
    <section className="bg-white">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-[calc(1440*var(--u))] items-end gap-8 px-[calc(96*var(--u))] py-[calc(120*var(--u))] wf-d:grid wf-d:grid-cols-[calc(420*var(--u))_calc(500*var(--u))_minmax(0,1fr)] [@media(max-width:1099.98px)]:!grid-cols-[minmax(0,420fr)_minmax(0,500fr)_minmax(0,264fr)] [@media(max-width:1099.98px)]:!gap-[calc(32*var(--u))]">
        <div className="flex flex-col gap-[calc(56*var(--u))]">
          <Reveal>
            <h2 className="ps-serif [--fs-d:67]">{headline}</h2>
          </Reveal>
          <SlotImage
            slot="editorialKitchen"
            className="rounded-[18px]"
            style={{ height: "calc(300*var(--u))" }}
            parallax={18}
            sizes="30vw"
          />
        </div>
        <SlotImage
          slot="editorialDining"
          className="ps-sculpt"
          style={{ height: "calc(720*var(--u))" }}
          unveil
          parallax={40}
          sizes="35vw"
        />
        <SlotImage
          slot="editorialWaiter"
          className="rounded-[18px]"
          style={{ height: "calc(460*var(--u))" }}
          parallax={28}
          sizes="25vw"
        />
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-6 pt-16 pb-14 wf-d:hidden">
        <Reveal className="px-5">
          <h2 className="ps-serif">{headline}</h2>
        </Reveal>
        <SlotImage
          slot="editorialDining"
          className="ps-sculpt ml-5 h-[460px] !border-r-0"
          unveil
          sizes="100vw"
        />
        <div className="ps-swipe flex gap-3 pr-5 pl-5">
          <SlotImage
            slot="editorialWaiter"
            className="h-[360px] w-[280px] shrink-0 rounded-[20px]"
            sizes="280px"
          />
          <SlotImage
            slot="editorialKitchen"
            className="h-[360px] w-[280px] shrink-0 rounded-[20px]"
            sizes="280px"
          />
        </div>
      </div>
    </section>
  );
}
