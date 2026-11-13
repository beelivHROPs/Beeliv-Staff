/**
 * Training & Services (/training) copy and static structure.
 *
 * Source of truth: Training-Desktop.dc.html / Training-Mobile.dc.html
 * (canvas-source, re-exported 2026-09-26 20:23). COPY.md's "Training &
 * Services" section predates this board and is NOT used - every string below
 * is the wireframe's own text, verbatim. Anything in [square brackets] is a
 * still-open item and is rendered visibly bracketed; do not fill it in
 * without the project lead.
 *
 * Two copy blocks genuinely differ between the desktop and mobile boards
 * (not just wrapping) - both are kept, `*Desktop` / `*Mobile`, and the
 * component picks one with a responsive class, never JS.
 */
import { ROUTES } from "./content";

export const TRAINING_NAV_ACTIVE = ROUTES.training;

export const TRAINING_HERO = {
  eyebrow: "Training & Services",
  headlineLead: "Better service starts with",
  headlineAccent: "better-prepared people.",
  body: "Practical hospitality training built around the realities of service, leadership and day-to-day operations.",
  cta: { label: "Enquire About Training →", href: ROUTES.request },
} as const;

/**
 * "TRAINING / SERVICE CATEGORIES". `chip` + `count` are desktop-only (the
 * mobile accordion summary shows only the title + count, no chip badge).
 */
export const TRAINING_CATEGORIES = {
  eyebrow: "What we offer",
  headlineLead: "Four practice areas,",
  headlineAccent: "together or one at a time.",
  items: [
    {
      chip: "Service",
      count: "9 tracks",
      title: "Hospitality Training & Development",
      body: "Practical tracks delivered on your own floor, in your own kitchen, with your own service sequence.",
      list: [
        "Front office staff",
        "Restaurant & lounge teams",
        "Food & beverage service",
        "Kitchen operations",
        "Customer service excellence",
        "Leadership & team management",
        "Fine dining service",
        "POS & restaurant technology",
        "Food safety & hygiene",
      ],
      link: { label: "Enquire →", href: ROUTES.request },
    },
    {
      chip: "Systems",
      count: "6 services",
      title: "Restaurant & Hospitality Consulting",
      body: "From a business that hasn't opened yet to a floor that needs its standards rewritten.",
      list: [
        "Restaurant setup & launch support",
        "Standard operating procedures",
        "Service quality improvement",
        "Customer experience management",
        "Brand development",
        "Operational restructuring",
      ],
      link: { label: "Enquire →", href: ROUTES.request },
    },
    {
      chip: "People",
      count: "6 services",
      title: "Recruitment & HR Support",
      body: "Service-ready people, plus the structure and paperwork that keep them.",
      list: [
        "Staff recruitment & selection",
        "Employee onboarding",
        "HR documentation",
        "Performance evaluation",
        "Team structuring",
        "Payroll management",
      ],
      link: { label: "Request talent →", href: ROUTES.request },
    },
    {
      chip: "Systems",
      count: "5 services",
      title: "Business Development Support",
      body: "Turning a well-run business into one that keeps its tables full.",
      list: [
        "Sales & marketing strategies",
        "Customer retention systems",
        "Team productivity improvement",
        "Brand positioning",
        "Service audits & assessments",
      ],
      link: { label: "Enquire →", href: ROUTES.request },
    },
  ],
} as const;

/** "WHO IT'S FOR": two cards + the dark "who we serve" panel. */
export const TRAINING_WHO_ITS_FOR = {
  businesses: {
    eyebrow: "For businesses",
    title: "Developing an existing team",
    bodyDesktop:
      "Customised programmes for startups and established venues, from front of house to back of house.",
    bodyMobile:
      "Customised programmes for startups and established venues, front and back of house.",
  },
  professionals: {
    eyebrow: "For professionals",
    title: "Preparing for new opportunities",
    // Wording drawn from the company profile booklet (mission: train future
    // leaders, provide skilled professionals). It does NOT promise individual
    // enrolment - that is still unconfirmed with Beeliv.
    bodyDesktop:
      "We train hospitality professionals so they are ready for the roles our clients hire for. Contact us to ask about upcoming sessions.",
    bodyMobile: "We train professionals for the roles our clients hire for. Contact us to ask about sessions.",
  },
} as const;

export const TRAINING_WHO_WE_SERVE = {
  eyebrow: "Who we serve",
  headlineLead: "Built for every kind of",
  headlineAccent: "hospitality business.",
  // Desktop-only body line (not present in the mobile board's panel).
  bodyDesktop: "From a single café to a hotel group, the same standards apply.",
  tiles: [
    { label: "Restaurants", icon: "restaurant" },
    { label: "Hotels", icon: "hotel" },
    { label: "Lounges & bars", icon: "lounge" },
    { label: "Cafés", icon: "cafe" },
    { label: "Event centres", icon: "eventCentre" },
    { label: "Fast food brands", icon: "fastFood" },
    { label: "Hospitality startups", icon: "startup" },
    { label: "Catering businesses", icon: "catering" },
  ],
} as const;

/**
 * "HOW WE WORK · TRAINING CYCLE". Same four stage names as Home's §06
 * (Understand/Design/Develop/Improve) but a distinct copy set and a circular
 * "cycle" diagram, not Home's staircase - built as its own component
 * (TrainingCycle), not a reuse of HowWeWork/StepBar. See
 * components/public/training/TrainingCycle.tsx.
 */
export const TRAINING_CYCLE = {
  eyebrow: "How we work",
  headlineLead: "Training that",
  headlineAccent: "keeps improving.",
  body: "Every programme runs as a cycle, so standards keep rising after the first session.",
  steps: [
    { num: "01", name: "Understand", text: "We assess your team's skills on the floor." },
    {
      num: "02",
      name: "Design",
      text: "A programme shaped around your menu, service and standards.",
    },
    {
      num: "03",
      name: "Develop",
      text: "Practical sessions on your own floor, with your own team.",
    },
    {
      num: "04",
      name: "Improve",
      text: "We measure the results and refresh the training.",
    },
  ],
  centerLabel: "A cycle, not a one-off",
  /** Mobile-only closing panel (desktop shows the centre badge instead). */
  mobileClosing: { lead: "Then back to", num: "01", trail: ". A cycle, not a one-off." },
} as const;

export const TRAINING_CTA = {
  headlineLead: "Start with a",
  headlineAccent: "service audit.",
  primaryCta: { label: "Book a Service Audit →", href: ROUTES.request },
  secondaryCta: { label: "Enquire about training →", href: ROUTES.request },
} as const;
