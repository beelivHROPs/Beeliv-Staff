import type { Metadata } from "next";
import { AboutBody } from "@/components/public/about/AboutBody";
import { ABOUT_STORY } from "@/lib/public-site/about-content";

export const metadata: Metadata = {
  title: "About Us",
  description: ABOUT_STORY.lead,
};

/**
 * /about (About-Desktop / About-Mobile.dc.html): the Beeliv story, vision +
 * mission, values, the People/Systems/Service pillars, a photo row and the
 * team. Entirely static copy - no data fetch, so nothing here suspends above
 * this route's own loading.tsx.
 */
export default function AboutPage() {
  return <AboutBody />;
}
