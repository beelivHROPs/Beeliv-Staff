import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { BUSINESS_NAV_ACTIVE } from "@/lib/public-site/business-content";
import { BusinessHero } from "./Hero";
import { ClientLogos } from "./ClientLogos";
import { PracticeAreas } from "./PracticeAreas";
import { Problems } from "./Problems";
import { ServiceAuditCta } from "./ServiceAuditCta";
import { Timeline } from "./Timeline";
import { WhyBeeliv } from "./WhyBeeliv";

/**
 * /business page frame (Business-Desktop / Business-Mobile.dc.html): standard
 * header, hero, business problems, all four practice areas, the how-it-works
 * timeline, why Beeliv, client logos and the service-audit CTA, then the
 * footer. Entirely static (no dynamic children slot), so page.tsx and
 * loading.tsx both just render this directly - the `.skel` wrapper class
 * (see app/(public)/public-site.css) does the rest.
 */
export function BusinessShell() {
  return (
    <MenuProvider>
      <PageHeader activeHref={BUSINESS_NAV_ACTIVE} />
      <main>
        <BusinessHero />
        <Problems />
        <PracticeAreas />
        <Timeline />
        <WhyBeeliv />
        <ClientLogos />
        <ServiceAuditCta />
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
