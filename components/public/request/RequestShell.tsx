import type { ReactNode } from "react";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Reveal } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import { REQUEST_HERO, REQUEST_NAV_ACTIVE, WHAT_NEXT } from "@/lib/public-site/request-content";
import { NextList } from "./parts";

function Phone() {
  return (
    <p className="ps-sm">
      <T>{WHAT_NEXT.phoneLead}</T>{" "}
      <a href={WHAT_NEXT.phoneHref} className="font-bold !text-(--ink) hover:!text-(--deep-plum)">
        <T>{WHAT_NEXT.phone}</T>
      </a>
    </p>
  );
}

/**
 * Request Talent page frame (Request-Desktop / Request-Mobile.dc.html):
 * standard header, the intro column (eyebrow, h1, line, and on desktop "What
 * happens next" + phone), the form slot, and the footer. Below 820px the
 * intro sits above the form and "What happens next" moves under it in a white
 * band. `children` is the form area: the live wizard, or its skeleton.
 */
export function RequestShell({ children }: { children: ReactNode }) {
  return (
    <MenuProvider>
      {/* `au-shell` only supplies the shared error-colour variables. */}
      <div className="au-shell">
        <PageHeader activeHref={REQUEST_NAV_ACTIVE} />
        <main className="mx-auto max-w-[calc(1440*var(--u))] wf-d:grid wf-d:grid-cols-[calc(430*var(--u))_minmax(0,1fr)] wf-d:items-start wf-d:gap-[calc(80*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(96*var(--u))] wf-d:pb-[calc(120*var(--u))]">
          <aside className="flex flex-col gap-[14px] px-5 pt-10 pb-6 wf-d:gap-[calc(26*var(--u))] wf-d:p-0">
            <Reveal when="mount" y={12}>
              <Eyebrow className="!text-[12px]">{REQUEST_HERO.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(1)}>
              <h1 className="ps-serif [--fs-d:59] [--fs-m:30]">
                <T>{REQUEST_HERO.title}</T>
              </h1>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(2)}>
              <p className="ps-bd">
                <T>{REQUEST_HERO.body}</T>
              </p>
            </Reveal>

            <Reveal
              when="mount"
              y={16}
              delay={stagger(3)}
              className="hidden flex-col gap-[calc(26*var(--u))] wf-d:flex"
            >
              <div className="flex flex-col gap-[18px] border-t border-(--soft-border) pt-6">
                <Eyebrow className="!text-[12px] !text-(--muted-text)">{WHAT_NEXT.eyebrow}</Eyebrow>
                <NextList steps={WHAT_NEXT.steps} numeralClass="[--fs-d:29] [--fs-m:26]" />
              </div>
              <Phone />
            </Reveal>
          </aside>

          <div className="px-5 pt-2 pb-10 wf-d:p-0">{children}</div>

          <section className="flex flex-col gap-[18px] border-t border-(--soft-border) bg-white px-5 py-12 wf-d:hidden">
            <Eyebrow className="!text-[12px] !text-(--muted-text)">{WHAT_NEXT.eyebrow}</Eyebrow>
            <NextList steps={WHAT_NEXT.steps} numeralClass="[--fs-m:26]" />
            <Phone />
          </section>
        </main>
        <SiteFooter />
      </div>
    </MenuProvider>
  );
}
