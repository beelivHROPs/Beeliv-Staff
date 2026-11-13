import { ABOUT_NAV_ACTIVE } from "@/lib/public-site/about-content";
import { PageHeader } from "../PageHeader";
import { SiteFooter } from "../SiteFooter";
import { MenuProvider } from "../SiteHeader";
import { AboutImagery } from "./AboutImagery";
import { AboutPillars } from "./AboutPillars";
import { AboutStory } from "./AboutStory";
import { AboutTeam } from "./AboutTeam";
import { AboutValues } from "./AboutValues";
import { AboutVisionMission } from "./AboutVisionMission";

/**
 * About Us. Section order: THE BEELIV STORY, VISION + MISSION, MEET OUR TEAM,
 * WHAT DRIVES US, PEOPLE / SYSTEMS / SERVICE, HOSPITALITY IMAGERY, plus the
 * standard header/footer. Team was moved up to sit right after Vision +
 * Mission (project-lead request) - the wireframe boards themselves still
 * show Team last, so this is a deliberate deviation, not a wireframe match.
 * The whole page is static copy (no live data), so this one component is
 * reused byte-for-byte by both app/(public)/about/page.tsx and its
 * loading.tsx, wrapped in `.skel` there - same technique as
 * app/(public)/(home)/loading.tsx + HomeBody.
 */
export function AboutBody() {
  return (
    <MenuProvider>
      <PageHeader activeHref={ABOUT_NAV_ACTIVE} />
      <main>
        <AboutStory />
        <AboutVisionMission />
        <AboutTeam />
        <AboutValues />
        <AboutPillars />
        <AboutImagery />
      </main>
      <SiteFooter />
    </MenuProvider>
  );
}
