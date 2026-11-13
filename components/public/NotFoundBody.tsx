import Link from "next/link";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Btn, LiftCard, Reveal, TextLink } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import { SlotImage } from "@/components/public/SlotImage";
import {
  BuildingIcon,
  HelpIcon,
  HomeIcon,
  JobsSearchIcon,
  OfficeIcon,
} from "@/components/public/icons";
import { NOT_FOUND } from "@/lib/public-site/not-found-content";
import { ROUTES } from "@/lib/public-site/content";
import type { ComponentType } from "react";

/** Icon per `NOT_FOUND.quickLinks[i].icon` (lib/public-site/not-found-content.ts).
 * "jobs" reuses BuildingIcon - the source board draws the identical glyph for
 * "Browse Vacancies" as it does elsewhere for building/venue icons (see that
 * icon's own doc comment in components/public/icons.tsx). */
const QUICK_LINK_ICONS: Record<
  (typeof NOT_FOUND.quickLinks)[number]["icon"],
  ComponentType<{ size?: number; strokeWidth?: number; stroke?: string; className?: string }>
> = {
  home: HomeIcon,
  jobs: BuildingIcon,
  help: HelpIcon,
  business: OfficeIcon,
};

/**
 * NotFound-Desktop.dc.html / NotFound-Mobile.dc.html.
 *
 * Shared by both 404 boundaries this repo needs - app/not-found.tsx (root,
 * for URLs that match no route at all) and app/(public)/not-found.tsx (for
 * notFound() calls thrown from inside the (public) tree, e.g. an unknown
 * /jobs/[id]) - so both render byte-for-byte the same page. See each of
 * those files for why two boundaries exist.
 *
 * Copy source: NOT_FOUND in lib/public-site/not-found-content.ts (no
 * COPY.md section for this screen - the wireframe text is used verbatim,
 * nothing bracketed). The wireframe's ".mk" annotation markers ("404 · PAGE
 * NOT FOUND", "FOOTER") and the illustration tile's "ILLUSTRATION · ..."
 * caption are design-tool notes, not real UI - skipped, same rule already
 * applied on every other public-site screen (e.g. jobs/EmptyState.tsx's
 * dashed illustration tile renders only the icon, no caption).
 *
 * Layout: mobile stacks illustration -> copy -> quick links; desktop moves
 * the illustration into a 560px right-hand column beside the copy, with
 * quick links spanning full width below both. Both breakpoints share one
 * DOM order (illustration, copy, quick links) and swap positions purely via
 * `order` inside the desktop grid, so no separate mobile/desktop markup is
 * needed.
 */
export function NotFoundBody() {
  return (
    <MenuProvider>
      <PageHeader activeHref="" />
      <main className="mx-auto max-w-[calc(1440*var(--u))]">
        <section className="flex flex-col gap-[18px] px-5 pt-8 pb-14 wf-d:grid wf-d:grid-cols-[minmax(0,1fr)_calc(680*var(--u))] wf-d:items-start wf-d:gap-x-24 wf-d:gap-y-[calc(72*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(100*var(--u))] wf-d:pb-[calc(120*var(--u))]">
          {/* Illustration: mobile first, desktop right column. */}
          <Reveal when="mount" className="order-1 -mx-5 -mb-2 mt-1 wf-d:order-2 wf-d:mx-0 wf-d:mb-0 wf-d:mt-0">
            {/* No box: the whole illustration is shown (not cropped) and its white backdrop blends into the page. */}
            <SlotImage
              slot="notFoundIllustration"
              fit="contain-top"
              className="h-[calc(100vw*2/3)] w-full mix-blend-multiply wf-d:h-[calc(453*var(--u))]"
              placeholderClassName="ps-img-dash"
            />
          </Reveal>

          {/* Copy: mobile second, desktop left column. */}
          <div className="order-2 flex flex-col gap-[18px] wf-d:order-1 wf-d:gap-[22px]">
            <Reveal when="mount" y={16}>
              <div
                aria-hidden="true"
                className="ps-serif [--fs-d:140] [--fs-m:96] !leading-[1.05] font-semibold tracking-[-0.02em] -mt-[0.1em] -mb-[0.1em] py-[0.08em]"
                style={{
                  backgroundImage: "var(--purple-gradient)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                404
              </div>
            </Reveal>
            <Reveal when="mount" delay={stagger(1)}>
              <Eyebrow>{NOT_FOUND.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(2)}>
              <h1 className="ps-serif [--fs-d:56] [--fs-m:30]">
                <T>{NOT_FOUND.headline}</T>
              </h1>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(3)}>
              <p className="ps-bd !text-[17px]">
                <T>{NOT_FOUND.body}</T>
              </p>
            </Reveal>

            <Reveal
              when="mount"
              delay={stagger(4)}
              className="flex flex-col gap-3 pt-1.5 wf-d:flex-row wf-d:gap-3.5"
            >
              <Btn href={NOT_FOUND.primaryCta.href} label={NOT_FOUND.primaryCta.label} variant="bp" />
              <Btn href={NOT_FOUND.secondaryCta.href} label={NOT_FOUND.secondaryCta.label} variant="bo" />
            </Reveal>

            <Reveal when="mount" delay={stagger(5)}>
              <form action={ROUTES.jobs} method="get" className="flex max-w-[520px] flex-col gap-2">
                <label htmlFor="nf-q" className="text-[15px] font-semibold text-(--ink)">
                  <T>{NOT_FOUND.searchLabel}</T>
                </label>
                <div className="flex h-14 items-center gap-2 rounded-[14px] border-[1.5px] border-(--soft-border) bg-white py-0 pr-1.5 pl-4">
                  <JobsSearchIcon size={20} strokeWidth={1.8} stroke="var(--muted-text)" />
                  <input
                    id="nf-q"
                    name="q"
                    type="search"
                    placeholder={NOT_FOUND.searchPlaceholder}
                    className="h-full min-w-0 grow border-0 bg-transparent text-base text-(--ink) outline-none placeholder:text-(--muted-text)"
                  />
                  <button type="submit" className="ps-btn ps-bp !h-11 !px-[18px] !text-[15px]">
                    <T>{NOT_FOUND.searchSubmit}</T>
                  </button>
                </div>
              </form>
            </Reveal>

            <Reveal when="mount" delay={stagger(6)}>
              <p className="text-[15px] text-(--muted-text)">
                <T>{NOT_FOUND.brokenLinkLead}</T>{" "}
                <TextLink
                  href={NOT_FOUND.brokenLinkCta.href}
                  label={NOT_FOUND.brokenLinkCta.label}
                  className="!text-[15px]"
                />{" "}
                <T>{NOT_FOUND.brokenLinkTrail}</T>
              </p>
            </Reveal>
          </div>

          {/* Quick links: always last, full width below both columns. */}
          <div className="order-3 flex flex-col gap-[18px] wf-d:col-span-full">
            <Eyebrow className="!text-[11px] !text-(--muted-text)">{NOT_FOUND.quickLinksEyebrow}</Eyebrow>
            <div className="grid grid-cols-2 gap-3 wf-d:grid-cols-4 wf-d:gap-4">
              {NOT_FOUND.quickLinks.map((item, i) => {
                const Icon = QUICK_LINK_ICONS[item.icon];
                return (
                  <Reveal key={item.title} delay={stagger(i)}>
                    <LiftCard
                      as="div"
                      className="ps-cd relative flex min-h-[150px] flex-col items-start gap-3 p-4 wf-d:min-h-[76px] wf-d:flex-row wf-d:items-center wf-d:gap-3.5"
                    >
                      <Link
                        href={item.href}
                        aria-label={`${item.title} — ${item.body}`}
                        className="absolute inset-0 rounded-[18px]"
                      />
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(91,8,123,.08)]"
                      >
                        <Icon size={22} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
                      </span>
                      <span aria-hidden="true" className="flex min-w-0 grow flex-col gap-[3px]">
                        <b className="text-[17px] font-bold text-(--ink)">
                          <T>{item.title}</T>
                        </b>
                        <span className="text-[15px] leading-[1.35] text-(--muted-text)">
                          <T>{item.body}</T>
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute top-[18px] right-4 text-[18px] text-(--beeliv-purple) wf-d:static"
                      >
                        →
                      </span>
                    </LiftCard>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
