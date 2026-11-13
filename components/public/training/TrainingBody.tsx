import { PageHeader } from "../PageHeader";
import { SiteFooter } from "../SiteFooter";
import { MenuProvider } from "../SiteHeader";
import { Btn, Reveal, TextLink } from "../kit";
import { Chip, Eyebrow, T, stagger } from "../primitives";
import { SlotImage } from "../SlotImage";
import { WhoWeServeIcon } from "../icons";
import {
  TRAINING_CATEGORIES,
  TRAINING_CTA,
  TRAINING_CYCLE,
  TRAINING_HERO,
  TRAINING_NAV_ACTIVE,
  TRAINING_WHO_ITS_FOR,
  TRAINING_WHO_WE_SERVE,
} from "@/lib/public-site/training-content";
import { TrainingCycle } from "./TrainingCycle";

/**
 * /training page body (Training-Desktop.dc.html / Training-Mobile.dc.html):
 * header, hero, training image, the four category cards, "who it's for",
 * the training cycle diagram, the enquiry CTA and the footer. No dynamic
 * data - shared as-is by page.tsx and loading.tsx (the latter wraps this in
 * `.skel`).
 */
export function TrainingBody() {
  return (
    <MenuProvider>
      <PageHeader activeHref={TRAINING_NAV_ACTIVE} />
      <main>
        {/* HERO */}
        <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-4 px-5 pt-11 pb-8 wf-d:grid wf-d:grid-cols-[1.3fr_1fr] wf-d:items-end wf-d:gap-24 wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(110*var(--u))] wf-d:pb-16">
          <Reveal when="mount" className="flex flex-col gap-3.5 wf-d:gap-6">
            <Eyebrow>{TRAINING_HERO.eyebrow}</Eyebrow>
            <h1 className="ps-serif [--fs-d:67] [--fs-m:30]">
              <T>{TRAINING_HERO.headlineLead}</T>{" "}
              <span className="ps-hl-b">
                <T>{TRAINING_HERO.headlineAccent}</T>
              </span>
            </h1>
          </Reveal>
          <Reveal when="mount" delay={0.08} className="flex flex-col gap-4 wf-d:gap-6 wf-d:pb-[10px]">
            <p className="ps-bd">
              <T>{TRAINING_HERO.body}</T>
            </p>
            <Btn
              href={TRAINING_HERO.cta.href}
              label={TRAINING_HERO.cta.label}
              variant="bp"
              hero
              className="self-start !h-12"
            />
          </Reveal>
        </section>

        {/* TRAINING IMAGE */}
        <section className="px-5 wf-d:px-[calc(96*var(--u))]">
          <SlotImage
            slot="trainingHero"
            className="h-[300px] rounded-[20px] wf-d:h-[calc(600*var(--u))] wf-d:rounded-[28px]"
            unveil
            sizes="(min-width: 820px) 90vw, 100vw"
            priority
          />
        </section>

        {/* TRAINING / SERVICE CATEGORIES */}
        <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-4 px-5 pt-16 pb-14 wf-d:gap-12 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
          <Reveal className="flex flex-col gap-3.5 wf-d:flex-row wf-d:items-end wf-d:justify-between wf-d:gap-6">
            <div className="flex flex-col gap-3 wf-d:gap-[18px]">
              <Eyebrow>{TRAINING_CATEGORIES.eyebrow}</Eyebrow>
              <h2 className="ps-serif max-w-none [--fs-d:53] [--fs-m:30] wf-d:max-w-[18ch]">
                <T>{TRAINING_CATEGORIES.headlineLead}</T>{" "}
                <span className="ps-hl-b">
                  <T>{TRAINING_CATEGORIES.headlineAccent}</T>
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="flex flex-col gap-3.5 wf-d:grid wf-d:grid-cols-4 wf-d:gap-5">
            {TRAINING_CATEGORIES.items.map((item, i) => (
              <Reveal key={item.title} delay={stagger(i)}>
                <details open className="tr-acc ps-cd flex flex-col gap-2.5 p-5 wf-d:gap-3.5 wf-d:p-[calc(30*var(--u))]">
                  <summary className="flex flex-col gap-3.5 wf-d:gap-[14px]">
                    <div className="hidden items-center justify-between wf-d:flex">
                      <Chip>{item.chip}</Chip>
                      <span className="text-[13px] font-bold text-(--muted-text)">
                        <T>{item.count}</T>
                      </span>
                    </div>
                    <h3 className="ps-serif [--fs-d:29] [--fs-m:25]">
                      <T>{item.title}</T>{" "}
                      <span className="font-sans text-[13px] font-bold text-(--muted-text) wf-d:hidden">
                        · <T>{item.count}</T>
                      </span>
                    </h3>
                  </summary>
                  <p className="text-[15px] leading-[1.5] text-(--ink)">
                    <T>{item.body}</T>
                  </p>
                  <ul className="m-0 flex flex-col gap-1 pl-[18px] text-[15px] leading-[1.5] text-(--muted-text)">
                    {item.list.map((li) => (
                      <li key={li}>
                        <T>{li}</T>
                      </li>
                    ))}
                  </ul>
                  <TextLink
                    href={item.link.href}
                    label={item.link.label}
                    className="hidden wf-d:inline-block"
                  />
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="flex flex-col gap-4 bg-white px-5 py-16 wf-d:gap-8 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
          <div className="grid grid-cols-1 gap-4 wf-d:grid-cols-2 wf-d:gap-8">
            <Reveal className="ps-cd flex flex-col gap-3 p-[26px] wf-d:gap-4 wf-d:p-11">
              <Eyebrow>{TRAINING_WHO_ITS_FOR.businesses.eyebrow}</Eyebrow>
              <h3 className="ps-serif [--fs-d:37] [--fs-m:30]">
                <T>{TRAINING_WHO_ITS_FOR.businesses.title}</T>
              </h3>
              <p className="ps-bd wf-d:hidden">
                <T>{TRAINING_WHO_ITS_FOR.businesses.bodyMobile}</T>
              </p>
              <p className="ps-bd hidden text-base wf-d:block">
                <T>{TRAINING_WHO_ITS_FOR.businesses.bodyDesktop}</T>
              </p>
            </Reveal>
            <Reveal delay={0.08} className="ps-cd flex flex-col gap-3 p-[26px] wf-d:gap-4 wf-d:p-11">
              <Eyebrow>{TRAINING_WHO_ITS_FOR.professionals.eyebrow}</Eyebrow>
              <h3 className="ps-serif [--fs-d:37] [--fs-m:30]">
                <T>{TRAINING_WHO_ITS_FOR.professionals.title}</T>
              </h3>
              <p className="ps-bd wf-d:hidden">
                <T>{TRAINING_WHO_ITS_FOR.professionals.bodyMobile}</T>
              </p>
              <p className="ps-bd hidden text-base wf-d:block">
                <T>{TRAINING_WHO_ITS_FOR.professionals.bodyDesktop}</T>
              </p>
            </Reveal>
          </div>

          <Reveal
            delay={0.16}
            className="mt-3 flex flex-col gap-[18px] rounded-[22px] px-5 py-[26px] pb-[22px] text-white wf-d:mt-0 wf-d:gap-8 wf-d:rounded-[28px] wf-d:p-12"
            style={{ background: "var(--deep-plum)" }}
          >
            <div className="flex flex-col gap-3 wf-d:flex-row wf-d:items-end wf-d:justify-between wf-d:gap-12">
              <div className="flex flex-col gap-3.5 wf-d:gap-[14px]">
                <Eyebrow className="!text-(--antique-gold)">{TRAINING_WHO_WE_SERVE.eyebrow}</Eyebrow>
                <h3 className="ps-serif max-w-none text-white [--fs-d:44] [--fs-m:28] wf-d:max-w-[18ch]">
                  <T>{TRAINING_WHO_WE_SERVE.headlineLead}</T>{" "}
                  <span className="text-(--antique-gold)">
                    <T>{TRAINING_WHO_WE_SERVE.headlineAccent}</T>
                  </span>
                </h3>
              </div>
              <p className="hidden max-w-[36ch] text-[17px] leading-[1.6] text-white/[.78] wf-d:block">
                <T>{TRAINING_WHO_WE_SERVE.bodyDesktop}</T>
              </p>
            </div>
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 wf-d:grid-cols-4 wf-d:gap-4">
              {TRAINING_WHO_WE_SERVE.tiles.map((tile, i) => (
                <Reveal
                  as="li"
                  key={tile.label}
                  delay={stagger(i, 0.04)}
                  className="flex flex-col gap-2.5 rounded-[18px] border border-white/[.14] bg-white/[.03] p-4 wf-d:gap-3.5 wf-d:p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-(--antique-gold) wf-d:h-14 wf-d:w-14">
                    <WhoWeServeIcon
                      name={tile.icon}
                      size={20}
                      strokeWidth={1.6}
                      stroke="var(--antique-gold)"
                      className="wf-d:hidden"
                    />
                    <WhoWeServeIcon
                      name={tile.icon}
                      size={26}
                      strokeWidth={1.6}
                      stroke="var(--antique-gold)"
                      className="hidden wf-d:block"
                    />
                  </span>
                  <span className="ps-serif text-white [--fs-d:23] [--fs-m:19] leading-[1.15]">
                    <T>{tile.label}</T>
                  </span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* HOW WE WORK · TRAINING CYCLE */}
        <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-5 px-5 py-16 wf-d:gap-14 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]">
          <Reveal className="flex flex-col gap-3.5 wf-d:grid wf-d:grid-cols-2 wf-d:items-end wf-d:gap-24">
            <div className="flex flex-col gap-3 wf-d:gap-[18px]">
              <Eyebrow>{TRAINING_CYCLE.eyebrow}</Eyebrow>
              <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
                <T>{TRAINING_CYCLE.headlineLead}</T>{" "}
                <span className="ps-hl-b">
                  <T>{TRAINING_CYCLE.headlineAccent}</T>
                </span>
              </h2>
            </div>
            <p className="ps-bd">
              <T>{TRAINING_CYCLE.body}</T>
            </p>
          </Reveal>

          <TrainingCycle />
        </section>

        {/* ENQUIRY CTA */}
        <section
          className="flex flex-col gap-5 px-5 py-[72px] text-white wf-d:flex-row wf-d:items-center wf-d:justify-between wf-d:gap-16 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]"
          style={{ background: "var(--purple-gradient)" }}
        >
          <Reveal>
            <h2 className="ps-serif max-w-none [--fs-d:56] [--fs-m:30] wf-d:max-w-[14ch]">
              <T>{TRAINING_CTA.headlineLead}</T>{" "}
              <span className="text-(--antique-gold)">
                <T>{TRAINING_CTA.headlineAccent}</T>
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col items-start gap-3.5">
            <Btn href={TRAINING_CTA.primaryCta.href} label={TRAINING_CTA.primaryCta.label} variant="bw" />
            <TextLink
              href={TRAINING_CTA.secondaryCta.href}
              label={TRAINING_CTA.secondaryCta.label}
              className="!border-white/60 !text-white"
            />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
