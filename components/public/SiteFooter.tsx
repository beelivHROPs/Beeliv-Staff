import Link from "next/link";
import { FOOTER, ROUTES } from "@/lib/public-site/content";
import { Reveal, SoftLink } from "./kit";
import { Logo } from "./Logo";
import { T, stagger } from "./primitives";

/**
 * Footer: deep-plum band. Brand line + three link columns, then the legal
 * line. Desktop: 4 columns (1.6 / 1 / 1 / 1). Mobile: brand block, then the
 * three link groups in a 2-column grid.
 */
export function SiteFooter() {
  return (
    <footer className="ps-ft bg-(--deep-plum) text-white">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-9 px-5 pt-16 pb-8 wf-d:gap-[calc(56*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(96*var(--u))] wf-d:pb-10">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 wf-d:grid-cols-[1.6fr_1fr_1fr_1fr] wf-d:gap-12">
          <Reveal className="col-span-2 mb-1 flex flex-col gap-4 wf-d:col-span-1 wf-d:mb-0 wf-d:gap-5">
            <Link href={ROUTES.home} aria-label="Beeliv Hospitality home" className="self-start">
              <Logo
                kind="reversed"
                tone="light"
                className="h-12 w-40 !border-white/35 wf-d:h-14 wf-d:w-[190px]"
              />
            </Link>
            <p className="max-w-none text-base leading-[1.55] text-white/[.72] wf-d:max-w-[30ch] wf-d:text-[17px]">
              <T>{FOOTER.brandLine}</T>
            </p>
          </Reveal>
          {FOOTER.columns.map((col, i) => (
            <Reveal key={col.title} delay={stagger(i + 1)}>
              <nav aria-label={col.title} className="flex flex-col gap-3 wf-d:gap-3.5">
                <div className="ps-eb !text-[12px] !text-(--antique-gold)">
                  <T>{col.title}</T>
                </div>
                {col.links.map((l) => (
                  <SoftLink key={l.label} href={l.href}>
                    <T>{l.label}</T>
                  </SoftLink>
                ))}
              </nav>
            </Reveal>
          ))}
        </div>
        <div className="ps-hr !bg-white/[.14]" />
        <div className="text-[13px] text-white/55 wf-d:flex wf-d:justify-between">
          <span>
            <T>{FOOTER.legalLeft}</T>
          </span>
          <span className="wf-d:hidden"> · </span>
          <span>
            <T>{FOOTER.legalRight}</T>
          </span>
        </div>
      </div>
    </footer>
  );
}
