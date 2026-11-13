import { TRAINING } from "@/lib/public-site/content";
import { Reveal, TextLink } from "./kit";
import { Eyebrow, T } from "./primitives";
import { SlotImage } from "./SlotImage";

/**
 * 08 Training. Photo bleeds off the LEFT edge (rounded on its right side);
 * text sits beside it on desktop and below it on mobile.
 */
export function Training() {
  return (
    <section>
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col wf-d:grid wf-d:grid-cols-[calc(820*var(--u))_minmax(0,1fr)] wf-d:items-center wf-d:gap-[calc(88*var(--u))] wf-d:py-[calc(120*var(--u))] wf-d:pr-[calc(96*var(--u))]">
        <div className="mt-14 mr-10 wf-d:m-0 wf-d:ml-[calc(var(--bleed)*-1)]">
          <SlotImage
            slot="training"
            className="h-[300px] rounded-r-[20px] !border-l-0 wf-d:h-[calc(640*var(--u))] wf-d:rounded-r-[24px]"
            unveil
            parallax={30}
            sizes="(min-width: 820px) 60vw, 100vw"
          />
        </div>
        <Reveal className="flex flex-col gap-4 px-5 pt-10 pb-16 wf-d:gap-6 wf-d:p-0">
          <Eyebrow className="!text-[12px]">{TRAINING.eyebrow}</Eyebrow>
          <h2 className="ps-serif [--fs-d:53]">
            <T>{TRAINING.headline}</T>
          </h2>
          <p className="ps-bd">
            <T>{TRAINING.body1}</T>
          </p>
          <p className="ps-bd">
            <T>{TRAINING.body2}</T>
          </p>
          <TextLink href={TRAINING.link.href} label={TRAINING.link.label} />
        </Reveal>
      </div>
    </section>
  );
}
