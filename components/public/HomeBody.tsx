import type { JobCardData } from "@/lib/jobs/card";
import { BrandIntro } from "./BrandIntro";
import { ClientMarquee } from "./ClientMarquee";
import { DualCta } from "./DualCta";
import { Editorial } from "./Editorial";
import { Hero } from "./Hero";
import { HowWeWork } from "./HowWeWork";
import { JobsTeaser } from "./JobsTeaser";
import { Pathways } from "./Pathways";
import { Pillars } from "./Pillars";
import { SiteFooter } from "./SiteFooter";
import { Training } from "./Training";

/**
 * Home page, sections 01 to 10 plus the footer, in wireframe order. Used by
 * both app/(public)/(home)/page.tsx and its loading skeleton (`skeleton` swaps the
 * few client-driven bits for their static form).
 */
export function HomeBody({
  jobs,
  skeleton = false,
  jobsUnavailable = false,
}: {
  jobs: JobCardData[];
  skeleton?: boolean;
  jobsUnavailable?: boolean;
}) {
  return (
    <>
      <main>
        <Hero skeleton={skeleton} />
        <ClientMarquee skeleton={skeleton} />
        <BrandIntro />
        <Pathways />
        <Pillars />
        <HowWeWork />
        {jobsUnavailable?<section className="mx-auto max-w-6xl px-5 py-10"><h2 className="text-2xl font-semibold">Latest vacancies</h2><p role="status">Vacancies are temporarily unavailable. Please check back shortly.</p></section>:<JobsTeaser jobs={jobs} />}
        <Training />
        <Editorial />
        <DualCta />
      </main>
      <SiteFooter />
    </>
  );
}
