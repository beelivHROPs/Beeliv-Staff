import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Btn, Reveal } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import { ROUTES } from "@/lib/public-site/content";

/**
 * Placeholder for a legal page (Privacy, Terms) until Beeliv supplies its own approved wording.
 * Legal text is never written or paraphrased here (docs/BEELIV-SOURCE-OF-TRUTH.md section 7): replace the body
 * with Beeliv's document when it arrives. Marked noindex by the pages that use it.
 */
export function LegalPlaceholder({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <MenuProvider>
      <PageHeader activeHref="" />
      <main className="mx-auto max-w-[calc(1440*var(--u))]">
        <section className="flex flex-col gap-[18px] px-5 pt-10 pb-20 wf-d:max-w-[820px] wf-d:gap-[22px] wf-d:px-[calc(80*var(--u))] wf-d:pt-16">
          <Reveal when="mount">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
          <Reveal when="mount" y={16} delay={stagger(1)}>
            <h1 className="ps-serif [--fs-d:48] [--fs-m:30]">
              <T>{title}</T>
            </h1>
          </Reveal>
          <Reveal when="mount" y={16} delay={stagger(2)}>
            <p className="ps-bd !text-[17px]">
              <T>This page is being prepared. Beeliv will publish its official wording here soon.</T>
            </p>
          </Reveal>
          <Reveal when="mount" y={16} delay={stagger(3)}>
            <p className="ps-bd !text-[17px]">
              <T>If you have a question about how your information is used or about our terms, please contact the Beeliv team and we will help.</T>
            </p>
          </Reveal>
          <Reveal when="mount" delay={stagger(4)} className="flex flex-col gap-3 pt-1.5 wf-d:flex-row wf-d:gap-3.5">
            <Btn href={ROUTES.contact} label="Contact Beeliv" variant="bp" />
            <Btn href="/" label="Back to home" variant="bo" />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
