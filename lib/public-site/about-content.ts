/**
 * About Us copy and static structure.
 *
 * Source of truth: canvas-source\About-Desktop.dc.html / About-Mobile.dc.html
 * (re-checked 2026-09-27, unchanged since the 26 Sep 20:23 export). This text
 * matches COPY.md section "5. About Us" verbatim, so COPY.md is not cited
 * separately per field. Anything in [square brackets] is still an open item
 * from the wireframe itself and is rendered visibly bracketed - do not fill
 * it in without the project lead.
 *
 * Two wireframe annotations are deliberately NOT modelled as page copy here
 * because they are `.tg` design-tool notes (the same class used for the "IMG
 * ·" placeholder tags elsewhere, which are never rendered - see
 * components/public/Editorial.tsx):
 *   - Story section: `Copy from 2025 company profile · confirm "founders"
 *     (plural) with client`
 *   - Team section: `Portraits from profile booklet · full surnames if they
 *     agree`
 * Both are open items for the project lead, not text to show visitors.
 */
import { ROUTES } from "./content";

export const ABOUT_NAV_ACTIVE = ROUTES.about;

export const ABOUT_STORY = {
  eyebrow: "About Beeliv",
  headlineLead: "Great people build",
  headlineAccent: "extraordinary experiences.",
  lead: "Beeliv Hospitality is a hospitality consulting, training, recruitment and business development company committed to raising service standards within Africa's hospitality industry.",
  body1:
    "Founded by passionate hospitality professionals with years of hands-on industry experience, we were created to bridge the gap between talent, professionalism and quality service delivery.",
  // Desktop reads the full sentence; the middle clause is dropped on mobile
  // (About-Mobile.dc.html body 2 is shorter). `middleClauseDesktopOnly` is
  // wrapped in a `hidden wf-d:inline` span so one string covers both boards.
  body2Lead: "The name Beeliv carries a double meaning: to believe in yourself and to believe in others.",
  body2MiddleClauseDesktopOnly: "In a world where hospitality is more than a job, it's a calling.",
  body2Tail: "Beeliv inspires service professionals to rise, to care deeply, and to say with confidence:",
  body2Bold: "Yes you can.",
  quote:
    "We believe hospitality is more than food and beverages. It is the art of creating memorable experiences through people, systems and consistency.",
  /** Desktop only - the wireframe's mobile blockquote has no attribution line. */
  quoteLabel: "Our foundation",
} as const;

export const ABOUT_VISION_MISSION = {
  visionEyebrow: "Our vision",
  vision:
    "To become Africa's leading hospitality consulting and training brand, known for transforming service culture, developing exceptional talent and building world-class hospitality businesses.",
  missionEyebrow: "Our mission",
  mission: [
    "Improve hospitality service standards through professional training.",
    "Provide businesses with skilled, service-oriented professionals.",
    "Help hospitality brands achieve operational excellence.",
    "Inspire individuals with the mindset that success is achievable through discipline, passion and consistency.",
  ],
} as const;

export const ABOUT_VALUES = {
  eyebrow: "Our values",
  headline: "What drives us",
  items: [
    { title: "Excellence", body: "High-quality service and professional standards in everything we put our name on." },
    { title: "Integrity", body: "Honesty, transparency and full accountability, on the floor and in the books." },
    { title: "Passion", body: "Passion drives innovation, creativity and exceptional guest experiences." },
    { title: "Teamwork", body: "Collaboration, clear communication and mutual respect between every section." },
    { title: "Growth", body: "Continuous investment in learning, development and measurable improvement." },
    { title: "Client first", body: "Our clients' success and their guests' satisfaction stay the top priority." },
  ],
} as const;

/**
 * People / Systems / Service. Same title/body text as PILLARS in ./content.ts
 * (Home §05), but this board combines the number and label into one eyebrow
 * ("01 People") and drops the chips and the "Explore Training" link that Home
 * draws - kept as its own local copy rather than reshaping the shared Home
 * data to fit.
 */
export const ABOUT_PILLARS = [
  {
    eyebrow: "01 People",
    title: "The right people change everything.",
    body: "Recruitment and talent solutions connecting hospitality businesses with capable, service-driven professionals.",
  },
  {
    eyebrow: "02 Systems",
    title: "Strong teams need strong systems.",
    body: "Practical HR and workforce support designed to help hospitality businesses operate more effectively.",
  },
  {
    eyebrow: "03 Service",
    title: "Exceptional service can be developed.",
    body: "Training designed to strengthen hospitality skills, service standards and professional growth.",
  },
] as const;

export const ABOUT_TEAM = {
  eyebrow: "The team",
  headline: "Meet our team",
  members: [
    {
      slot: "teamGodson",
      name: "Godson A.",
      role: "Head of Operations",
      bio: "A results-driven hospitality professional with a strong background in operational strategy, service delivery and team leadership. Skilled in streamlining processes, managing multi-site operations and driving performance across hotel, F&B and guest service departments.",
      bioMobile:
        "Results-driven hospitality professional with a strong background in operational strategy, service delivery and team leadership.",
    },
    {
      slot: "teamBlessing",
      name: "Blessing A.",
      role: "Capacity Developer & Training Facilitator",
      bio: "An engaging, culturally attuned HR professional passionate about developing people and creating inclusive, high-performing hospitality teams. Hands-on experience in recruitment, onboarding, skills training and leadership development.",
      bioMobile:
        "HR professional passionate about developing people and building inclusive, high-performing hospitality teams.",
    },
  ],
} as const satisfies {
  eyebrow: string;
  headline: string;
  members: readonly {
    slot: "teamGodson" | "teamBlessing";
    name: string;
    role: string;
    bio: string;
    bioMobile: string;
  }[];
};
