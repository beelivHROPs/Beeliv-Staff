import { BUSINESS_HERO } from "@/lib/public-site/business-content";
import { Btn, Reveal } from "@/components/public/kit";
import { Eyebrow, T } from "@/components/public/primitives";
import { SlotImage } from "@/components/public/SlotImage";
import { BuildingIcon } from "@/components/public/icons";

/**
 * Hero (Business-Desktop / Business-Mobile.dc.html "HERO"). Desktop: one
 * section, two-column grid (text | sculpted photo), 640px tall. Mobile: text
 * block, then a separate full-bleed sculpted photo strip below (not nested in
 * the padded text column) - same split as Hero.tsx's Desktop/Mobile pattern,
 * used here because the two boards are structurally different, not just a
 * reflow. The wireframe's own note says this slot reuses `pathwayTeam` (Home
 * Pathways "For businesses" card, "IMG · Team / business (reuse)") - a real,
 * distinct photo was later supplied for this page, so it now has its own
 * `businessHero` slot instead.
 */
function BusinessHeroDesktop() {
  return (
    <section className="relative hidden bg-white wf-d:grid wf-d:h-[calc(640*var(--u))] wf-d:grid-cols-[minmax(0,1fr)_calc(680*var(--u))]">
      <Reveal
        when="mount"
        className="flex flex-col justify-center gap-6 pr-[calc(64*var(--u))] pl-[calc(96*var(--u))]"
      >
        <Eyebrow>{BUSINESS_HERO.eyebrow}</Eyebrow>
        <h1 className="ps-serif [--fs-d:67]">
          <T>{BUSINESS_HERO.headlineLead}</T>{" "}
          <span className="ps-hl-b">
            <T>{BUSINESS_HERO.headlineAccent}</T>
          </span>
        </h1>
        <p className="ps-bd">
          <T>{BUSINESS_HERO.body}</T>
        </p>
        <div className="flex gap-4 pt-2">
          <Btn href={BUSINESS_HERO.primaryCta.href} label={BUSINESS_HERO.primaryCta.label} variant="bp" hero icon={<BuildingIcon size={18} />} className="!h-12" />
          <Btn href={BUSINESS_HERO.secondaryCta.href} label={BUSINESS_HERO.secondaryCta.label} variant="bo" className="!h-12" />
        </div>
      </Reveal>
      <SlotImage
        slot="businessHero"
        className="ps-sculpt h-full !border-t-0 !border-r-0"
        sizes="47vw"
        parallax={24}
      />
    </section>
  );
}

function BusinessHeroMobile() {
  return (
    <div className="wf-d:hidden">
      <section className="flex flex-col gap-4 px-5 pt-11 pb-10">
        <Reveal when="mount" className="flex flex-col gap-4">
          <Eyebrow>{BUSINESS_HERO.eyebrow}</Eyebrow>
          <h1 className="ps-serif [--fs-m:30]">
            <T>{BUSINESS_HERO.headlineLead}</T>{" "}
            <span className="ps-hl-b">
              <T>{BUSINESS_HERO.headlineAccent}</T>
            </span>
          </h1>
          <p className="ps-bd">
            <T>{BUSINESS_HERO.body}</T>
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <Btn href={BUSINESS_HERO.primaryCta.href} label={BUSINESS_HERO.primaryCta.label} variant="bp" hero icon={<BuildingIcon size={18} />} />
            <Btn href={BUSINESS_HERO.secondaryCta.href} label={BUSINESS_HERO.secondaryCta.label} variant="bo" />
          </div>
        </Reveal>
      </section>
      <SlotImage slot="businessHero" className="ps-sculpt ml-10 h-[280px] !border-r-0" sizes="100vw" />
    </div>
  );
}

export function BusinessHero() {
  return (
    <>
      <BusinessHeroDesktop />
      <BusinessHeroMobile />
    </>
  );
}
