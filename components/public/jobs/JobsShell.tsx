import type { ReactNode } from "react";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Reveal, SoftLink } from "@/components/public/kit";
import { Eyebrow, T } from "@/components/public/primitives";
import { JOBS_CANDIDATE_CTA, JOBS_HERO, JOBS_NAV_ACTIVE, JOBS_WHY_BEELIV } from "@/lib/public-site/jobs-content";

/**
 * /jobs page frame (Jobs-Desktop / Jobs-Mobile.dc.html): header, hero, the
 * search + filters + results slot (`children` - the live JobsBrowser or its
 * JobsSkeleton), the static "Why Beeliv" section, the candidate CTA panel and
 * the footer. Shared by page.tsx and loading.tsx so both render byte-for-byte
 * the same static markup.
 */
export function JobsShell({ children }: { children: ReactNode }) {
  return (
    <MenuProvider>
      <PageHeader activeHref={JOBS_NAV_ACTIVE} />
      <main>
        <section className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-3.5 px-5 pt-9 pb-2 wf-d:grid wf-d:grid-cols-2 wf-d:items-end wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(72*var(--u))] wf-d:pb-10">
          <Reveal when="mount" className="flex flex-col gap-3 wf-d:gap-[18px]">
            <Eyebrow className="!text-[11px] wf-d:!text-[12px]">{JOBS_HERO.eyebrow}</Eyebrow>
            <h1 className="ps-serif [--fs-d:66] [--fs-m:42] leading-[1.02]">
              <T>{JOBS_HERO.headlineLead}</T>{" "}
              <span className="text-(--beeliv-purple) not-italic">
                <T>{JOBS_HERO.headlineAccent}</T>
              </span>
            </h1>
          </Reveal>
          <Reveal when="mount" delay={0.08}>
            <p className="ps-bd">
              <T>{JOBS_HERO.body}</T>
            </p>
          </Reveal>
        </section>

        {children}

        <section className="bg-white wf-d:grid wf-d:grid-cols-[420px_minmax(0,1fr)] wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(120*var(--u))]">
          <Reveal className="flex flex-col gap-4 px-5 py-16 wf-d:gap-5 wf-d:p-0">
            <Eyebrow className="!text-[11px] wf-d:!text-[12px]">{JOBS_WHY_BEELIV.eyebrow}</Eyebrow>
            <h2 className="ps-serif [--fs-d:53] [--fs-m:30]">
              <T>{JOBS_WHY_BEELIV.headline}</T>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 px-5 pb-16 wf-d:grid-cols-3 wf-d:gap-10 wf-d:px-0 wf-d:pb-0">
            {JOBS_WHY_BEELIV.reasons.map((r, i) => (
              <Reveal
                key={r.title}
                delay={i * 0.08}
                className="flex flex-col gap-2.5 border-t border-(--ink) pt-[18px] wf-d:gap-3.5 wf-d:pt-6"
              >
                <h3 className="ps-serif [--fs-d:29] [--fs-m:25]">
                  <T>{r.title}</T>
                </h3>
                <p className="ps-bd text-base">
                  <T>{r.body}</T>
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <section
          className="flex flex-col gap-5 px-5 py-[72px] text-white wf-d:flex-row wf-d:items-center wf-d:justify-between wf-d:gap-16 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]"
          style={{ background: "var(--purple-gradient)" }}
        >
          <Reveal>
            <h2 className="ps-serif max-w-none [--fs-d:56] [--fs-m:30] wf-d:max-w-[14ch]">
              <T>{JOBS_CANDIDATE_CTA.headline}</T>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col items-start gap-4">
            <p className="max-w-none text-base leading-[1.55] text-white/80 wf-d:max-w-[36ch] wf-d:text-[18px]">
              <T>{JOBS_CANDIDATE_CTA.body}</T>
            </p>
            <SoftLink href={JOBS_CANDIDATE_CTA.cta.href} className="ps-btn ps-bw">
              <T>{JOBS_CANDIDATE_CTA.cta.label}</T>
            </SoftLink>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
