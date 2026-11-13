"use client";

/**
 * Error500-Desktop.dc.html / Error500-Mobile.dc.html: the public site's
 * "Something Went Wrong" (500) screen. Rendered by app/(public)/error.tsx,
 * a route-group-scoped error boundary so it renders with the (public) layout
 * (Newsreader font, public-site.css tokens, MenuProvider/SiteFooter chrome)
 * still mounted - see that file for why a root-level app/error.tsx alone
 * would lose all of that.
 *
 * Layout mirrors NotFoundBody's shape (illustration + copy + quick links),
 * but element order flips per breakpoint: desktop puts the copy column
 * first and the illustration second (wireframe grid-template-columns:
 * minmax(0,1fr) 560px); mobile puts the illustration first. Handled with
 * `order` utilities on a single markup tree rather than duplicating it.
 */
import Link from "next/link";
import { BuildingIcon, HelpIcon, HomeIcon, NoResultsIcon, OfficeIcon } from "./icons";
import { Btn, Reveal } from "./kit";
import { PageHeader } from "./PageHeader";
import { SiteFooter } from "./SiteFooter";
import { MenuProvider } from "./SiteHeader";
import { Eyebrow, T, stagger } from "./primitives";
import { ERROR_500 } from "@/lib/public-site/error-500-content";
import { ROUTES } from "@/lib/public-site/content";
import { errorReference } from "@/lib/ui/error-reference";

const QUICK_LINK_ICONS = {
  home: HomeIcon,
  jobs: BuildingIcon,
  help: HelpIcon,
  business: OfficeIcon,
} as const;

export function Error500Body({ retry, digest }: { retry: () => void; digest?: unknown }) {
  const reference = errorReference(digest);
  return (
    <MenuProvider>
      <div className="flex min-h-[calc(100dvh/var(--ps-zoom,1))] flex-col">
        {/* No nav item represents this screen, so nothing is marked active. */}
        <PageHeader activeHref="" />
        <main className="mx-auto w-full max-w-[calc(1440*var(--u))] flex-1">
          <section className="flex flex-col gap-[18px] px-5 pt-8 pb-14 wf-d:grid wf-d:grid-cols-[minmax(0,1fr)_calc(560*var(--u))] wf-d:items-center wf-d:gap-[calc(96*var(--u))] wf-d:gap-y-[calc(72*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(100*var(--u))] wf-d:pb-[calc(120*var(--u))]">
            {/* Illustration: first on mobile, second on desktop. */}
            <Reveal
              when="mount"
              className="order-1 flex h-[280px] shrink-0 flex-col items-center justify-center rounded-[32px] wf-d:order-2 wf-d:h-[560px]"
              style={{
                border: "1.5px dashed #8E86A8",
                background:
                  "radial-gradient(circle at 50% 45%, rgba(91,8,123,.10), rgba(91,8,123,.02) 62%)",
              }}
            >
              <NoResultsIcon size={56} strokeWidth={1.3} stroke="var(--beeliv-purple)" />
            </Reveal>

            {/* Copy column: second on mobile, first on desktop. */}
            <div className="order-2 flex flex-col gap-[18px] wf-d:order-1 wf-d:gap-[22px]">
              <Reveal when="mount" y={12}>
                <div
                  aria-hidden="true"
                  className="leading-[0.9] font-semibold text-[96px] wf-d:text-[140px]"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.02em",
                    background: "var(--purple-gradient)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  500
                </div>
              </Reveal>
              <Reveal when="mount" delay={stagger(1)}>
                <Eyebrow className="!text-[11px] wf-d:!text-[12px]">{ERROR_500.eyebrow}</Eyebrow>
              </Reveal>
              <Reveal when="mount" y={16} delay={stagger(2)}>
                <h1 className="ps-serif [--fs-d:56] [--fs-m:30] wf-d:whitespace-nowrap">
                  <T>{ERROR_500.headline}</T>
                </h1>
              </Reveal>
              <Reveal when="mount" y={16} delay={stagger(3)}>
                <p className="ps-bd !text-[17px]">
                  <T>{ERROR_500.body}</T>
                </p>
              </Reveal>

              <Reveal
                when="mount"
                delay={stagger(4)}
                className="flex flex-col gap-3 pt-1.5 wf-d:flex-row wf-d:gap-3.5"
              >
                <Btn href={ERROR_500.primaryCta.href} label={ERROR_500.primaryCta.label} variant="bp" />
                <button type="button" onClick={() => retry()} className="ps-btn ps-bo">
                  <T>{ERROR_500.retryLabel}</T>
                </button>
              </Reveal>

              <Reveal
                when="mount"
                delay={stagger(5)}
                className="flex flex-col gap-2 pt-2 wf-d:max-w-[520px]"
              >
                <form action={ROUTES.jobs} method="get" className="flex flex-col gap-2">
                  <label htmlFor="e500-q" className="text-[15px] font-semibold text-(--ink)">
                    <T>{ERROR_500.searchLabel}</T>
                  </label>
                  <div className="flex h-14 items-center gap-2 rounded-[14px] border-[1.5px] border-(--soft-border) bg-white py-0 pr-1.5 pl-4">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--muted-text)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" />
                    </svg>
                    <input
                      id="e500-q"
                      name="q"
                      type="search"
                      placeholder={ERROR_500.searchPlaceholder}
                      className="h-full min-w-0 grow border-0 bg-transparent text-base text-(--ink) outline-none placeholder:text-(--muted-text)"
                    />
                    <button type="submit" className="ps-btn ps-bp !h-11 !px-[18px] !text-[15px]">
                      <T>{ERROR_500.searchSubmit}</T>
                    </button>
                  </div>
                </form>
              </Reveal>

              <Reveal when="mount" delay={stagger(6)} className="text-[15px] text-(--muted-text)">
                <T>{ERROR_500.stillNotWorkingLead}</T>{" "}
                <Link href={ERROR_500.stillNotWorkingCta.href} className="ps-ln !text-[15px]">
                  <T>{ERROR_500.stillNotWorkingCta.label}</T>
                </Link>{" "}
                <T>{ERROR_500.stillNotWorkingTrail}</T>
                {reference ? (
                  <span className="mt-1 block text-[14px]">
                    Reference: <b className="font-semibold">{reference}</b>
                  </span>
                ) : null}
              </Reveal>
            </div>

            {/* Quick links: spans full width under both columns. */}
            <div className="order-3 flex flex-col gap-[18px] pt-3.5 wf-d:col-span-2 wf-d:gap-[18px] wf-d:pt-0">
              <Eyebrow className="!text-[11px] !text-(--muted-text)">
                {ERROR_500.quickLinksEyebrow}
              </Eyebrow>
              <div className="grid grid-cols-2 gap-3 wf-d:grid-cols-4 wf-d:gap-4">
                {ERROR_500.quickLinks.map((link) => {
                  const Icon = QUICK_LINK_ICONS[link.icon as keyof typeof QUICK_LINK_ICONS];
                  return (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="ps-cd relative flex min-h-[150px] flex-col items-start gap-3 p-4 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(17,17,27,.10)] wf-d:min-h-[76px] wf-d:flex-row wf-d:items-center wf-d:gap-3.5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(91,8,123,.08)]">
                        <Icon size={22} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
                      </span>
                      <span className="flex min-w-0 grow flex-col gap-0.5">
                        <b className="text-[17px] font-bold text-(--ink)">
                          <T>{link.title}</T>
                        </b>
                        <span className="text-[15px] leading-[1.35] text-(--muted-text)">
                          <T>{link.body}</T>
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute top-[18px] right-4 text-lg text-(--beeliv-purple) wf-d:static wf-d:ml-auto"
                      >
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </MenuProvider>
  );
}
