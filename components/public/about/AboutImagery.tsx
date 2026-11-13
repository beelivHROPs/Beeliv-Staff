import { SlotImage } from "../SlotImage";

/**
 * "HOSPITALITY IMAGERY" / "IMAGERY" - decorative photo row, no copy.
 * Desktop: three photos, bottom-aligned, uneven heights (1.4fr/1fr/1fr).
 * Mobile: one large sculpted photo, then a two-up swipe row.
 */
export function AboutImagery() {
  return (
    <section className="bg-white">
      <div className="mx-auto hidden max-w-[calc(1440*var(--u))] items-end gap-5 px-[calc(96*var(--u))] py-[calc(110*var(--u))] wf-d:grid wf-d:grid-cols-[1.4fr_1fr_1fr]">
        <SlotImage
          slot="aboutDining"
          className="rounded-[20px]"
          style={{ height: "calc(520*var(--u))" }}
          parallax={20}
          sizes="35vw"
        />
        <SlotImage
          slot="aboutKitchen"
          className="rounded-[20px]"
          style={{ height: "calc(400*var(--u))" }}
          parallax={14}
          sizes="25vw"
        />
        <SlotImage
          slot="aboutStaff"
          className="rounded-[20px]"
          style={{ height: "calc(460*var(--u))" }}
          parallax={26}
          sizes="25vw"
        />
      </div>

      <div className="flex flex-col gap-3 py-14 wf-d:hidden">
        <SlotImage slot="aboutDining" className="ps-sculpt ml-5 h-[420px] !border-r-0" unveil sizes="100vw" />
        <div className="ps-swipe flex gap-3 pr-5 pl-5">
          <SlotImage slot="aboutKitchen" className="h-[340px] w-[280px] shrink-0 rounded-[20px]" sizes="280px" />
          <SlotImage slot="aboutStaff" className="h-[340px] w-[280px] shrink-0 rounded-[20px]" sizes="280px" />
        </div>
      </div>
    </section>
  );
}
