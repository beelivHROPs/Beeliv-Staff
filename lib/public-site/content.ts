/**
 * Public marketing site: Home page copy and static structure.
 *
 * Source of truth: C:\Users\USER\Documents\beeliv-website\COPY.md, section
 * "1. Home - LOCKED (client-focus pass applied 26 Sep 2026)". Copy is used
 * verbatim. Anything in [square brackets] is deliberately still TBD and is
 * rendered visibly bracketed - do not fill it in without the project lead.
 *
 * Where the wireframe (canvas-source/*.dc.html) contains an element that
 * COPY.md does not cover (e.g. the "01. Where are you now?" step questions and
 * "You get: ..." lines), it is carried over from the wireframe and marked
 * WIREFRAME-ONLY below so it is easy to find and confirm.
 *
 * Route targets that do not exist yet point at their intended future path so
 * nothing needs touching again when those pages are built.
 */

import { PUBLIC_CONTACT_MAILTO } from "./contact-address";

export const ROUTES = {
  home: "/",
  jobs: "/jobs",
  business: "/business",
  training: "/training",
  about: "/about",
  contact: "/contact",
  login: "/login", // exists in this repo
  signup: "/signup", // future (Auth-Signup wireframe)
  request: "/request", // future (Request wireframe): Book a Service Audit
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: ROUTES.home },
  { label: "Find Jobs", href: ROUTES.jobs },
  { label: "For Businesses", href: ROUTES.business },
  { label: "Training & Services", href: ROUTES.training },
  { label: "About Us", href: ROUTES.about },
  { label: "Contact", href: ROUTES.contact },
] as const;

/** Mobile menu strings that exist only in Nav-Mobile.dc.html (not in COPY.md). */
export const MOBILE_MENU = {
  eyebrow: "Explore",
  getStarted: "Get Started →",
  login: "Log in",
  hiringPrompt: "Hiring for your business?",
  hiringLink: "Request talent →",
  phone: "+234 808 283 3989",
  socials: ["Instagram", "LinkedIn"],
} as const;

export const HERO = {
  eyebrow: "More than jobs",
  headlineLead: "Transforming hospitality through",
  headlineAccent: "people, systems and service excellence.",
  body: "We train hospitality teams, rebuild the operations behind them, and place service-ready staff in restaurants, hotels and lounges across Africa.",
  primaryCta: { label: "Book a Service Audit →", href: ROUTES.request },
  secondaryCta: { label: "Find Hospitality Jobs →", href: ROUTES.jobs },
  trustLine: "Trusted by hospitality businesses to build exceptional teams.",
  talentCard: {
    title: "Skilled Hospitality Talent",
    sub: "Pre-screened. Ready for opportunity.",
    href: ROUTES.request,
  },
  storyLink: { label: "Our Story →", href: "#brand-intro" },
} as const;

/** Desktop-only hero indicator. Each links to a pillar column in section 05. */
export const PILLAR_INDICATOR = [
  { num: "01", label: "People", target: "pillar-people" },
  { num: "02", label: "Systems", target: "pillar-systems" },
  { num: "03", label: "Service", target: "pillar-service" },
] as const;

/** Mobile-only "who we serve" strip. Icon path data lives in components/public/icons.tsx. */
export const WHO_WE_SERVE = [
  { label: "Restaurants", icon: "restaurant" },
  { label: "Hotels", icon: "hotel" },
  { label: "Lounges & Bars", icon: "lounge" },
  { label: "Cafés", icon: "cafe" },
  { label: "Event Centres", icon: "events" },
  { label: "Catering", icon: "catering" },
] as const;

export const CLIENTS = {
  // OPEN QUESTION (project lead): COPY.md asks to confirm the "20+" figure.
  // Deliberately NOT shown on the page - the wireframes render only the label.
  label: "Trusted by 20+ hospitality businesses",
  names: [
    "Beer Barn",
    "Carneval",
    "Mar's Café",
    "RÓDO",
    "Shades Social",
    "KALINA",
    "Mono Liza",
    "The Honeysuckle",
    "Uncle T's",
    "Bleu Café",
    "Dúna Dúra",
    "Eko In Abuja",
    "iCart",
    "Emi's Cocktails",
  ],
} as const;

export const BRAND_INTRO = {
  eyebrow: "Two worlds. One purpose.",
  headlineLead: "Great people build",
  headlineAccent: "extraordinary experiences.",
  body: "Beeliv is a hospitality consulting, training, recruitment and business development company. We help exceptional people find meaningful opportunities and support hospitality businesses in building strong, reliable teams.",
  link: { label: "About Beeliv →", href: ROUTES.about },
  badge: ["HOSPITALITY", "PEOPLE.", "REAL IMPACT."],
} as const;

export const PATHWAYS = [
  {
    eyebrow: "For hospitality professionals",
    headlineDesktop: ["Find where", "you belong."],
    body: "Discover opportunities with hospitality businesses looking for people ready to grow, contribute and build meaningful careers.",
    link: { label: "Explore Jobs →", href: ROUTES.jobs },
    image: "pathwayChef",
  },
  {
    eyebrow: "For businesses",
    headlineDesktop: ["Build a team", "worthy of your brand."],
    body: "From recruitment to workforce support, we help hospitality businesses find and develop the people behind exceptional service.",
    link: { label: "Hire Talent →", href: ROUTES.request },
    image: "pathwayTeam",
  },
] as const;

export const PILLARS = [
  {
    id: "pillar-people",
    num: "01",
    label: "People",
    title: "The right people change everything.",
    body: "Recruitment and talent solutions connecting hospitality businesses with capable, service-driven professionals.",
    chips: ["Recruitment & HR Support"],
  },
  {
    id: "pillar-systems",
    num: "02",
    label: "Systems",
    title: "Strong teams need strong systems.",
    body: "Practical HR and workforce support designed to help hospitality businesses operate more effectively.",
    chips: ["Consulting", "Business Development"],
  },
  {
    id: "pillar-service",
    num: "03",
    label: "Service",
    title: "Exceptional service can be developed.",
    body: "Training designed to strengthen hospitality skills, service standards and professional growth.",
    chips: ["Training & Development"],
  },
] as const;

export const PILLARS_LINK = {
  label: "Explore Training & Services →",
  href: ROUTES.training,
} as const;

export const HOW_WE_WORK = {
  eyebrow: "How we work",
  headlineLead: "Four stages,",
  headlineAccent: "run in order.",
  body: "Training, mentorship, operational support and performance management, run in order, because each stage depends on the one before it.",
  cta: { label: "Book a Service Audit →", href: ROUTES.request },
  auditLine: "A tailored review of your service, team and operations. Tell us about your venue and we will scope it with you.",
  // Step name + description are COPY.md. `question` and `get` are
  // WIREFRAME-ONLY (marked DRAFT in the wireframe: "stage questions + 'You get'
  // lines to confirm").
  steps: [
    {
      num: "01.",
      name: "Understand",
      text: "Diagnose the business, the people and the service environment as they actually are.",
      question: "01. Where are you now?",
      get: "You get: a service audit report",
    },
    {
      num: "02.",
      name: "Design",
      text: "Build a practical solution around your business's needs, not a generic template.",
      question: "02. What should change?",
      get: "You get: an action plan and SOPs",
    },
    {
      num: "03.",
      name: "Develop",
      text: "Train, mentor and equip the team with the standards they'll be held to.",
      question: "03. Who makes it happen?",
      get: "You get: a trained, equipped team",
    },
    {
      num: "04.",
      name: "Improve",
      text: "Measure performance and strengthen systems so the results hold after we leave.",
      question: "04. Is it holding?",
      get: "You get: a performance review",
    },
  ],
} as const;

/**
 * 07 Featured opportunities (Home-Desktop-2.dc.html / Home-Mobile-2.dc.html,
 * marker "07 · FEATURED OPPORTUNITIES" - replaces the earlier "06 · JOBS"
 * design). `headlineAccent` is the middle word only ("opportunity"), same
 * lead/accent/trail split as HERO/HOW_WE_WORK/EDITORIAL but with a trailing
 * segment too since the accent sits mid-sentence here.
 */
export const JOBS_SECTION = {
  eyebrow: "Featured opportunities",
  headlineLead: "Your next",
  headlineAccent: "opportunity",
  headlineTrail: "could start here.",
  body: "Explore the latest hospitality roles from top restaurants, hotels and lifestyle businesses looking for talented people like you.",
  /** Trust row: icon (matched by index to TRUST_ICONS in JobsTeaser.tsx) + copy. */
  trust: [
    { title: "Verified businesses", mobileBody: "Work with trusted hospitality brands." },
    { title: "Real opportunities", mobileBody: "Access genuine and up-to-date roles." },
    { title: "Grow your career", mobileBody: "Learn, gain experience and advance." },
  ],
  /** Wireframe placeholder, deliberately still bracketed (see file header): the
   * board's own confirm-note flags "[100+] active vacancies" as needing a
   * real, live number. Do not fill in without the project lead. */
  /** Not shown on the live site until Beeliv confirms a real, live figure (see above). */
  showStat: false as boolean,
  statValue: "[100+]",
  statLabel: "Active vacancies this month",
  cta: { label: "View All Jobs →", href: ROUTES.jobs },
  /** 5th desktop grid tile, replaces the old separate "View All Jobs" button. */
  viewAllTile: {
    title: "View All Jobs",
    body: "Explore all available opportunities across different roles and locations.",
  },
  cardLink: "View Role →",
} as const;

export const TRAINING = {
  eyebrow: "Training & Development",
  headline: "Better service starts with better-prepared people.",
  body1:
    "Practical hospitality training built around the realities of service, leadership and day-to-day operations.",
  body2:
    "Whether you're developing an existing team or preparing professionals for new opportunities, Beeliv helps turn potential into performance.",
  link: { label: "Explore Training →", href: ROUTES.training },
} as const;

export const EDITORIAL = {
  headlineLead: "Hospitality is experienced",
  headlineAccent: "in the details.",
} as const;

export const FINAL_CTA = {
  eyebrow: "Yes, you can.",
  headlineLead: "People build experiences.",
  headlineAccent: "Let's build better ones.",
  panels: [
    {
      text: "Looking for your next opportunity?",
      cta: { label: "Find Jobs →", href: ROUTES.jobs },
    },
    {
      text: "Building your hospitality team?",
      cta: { label: "Book a Service Audit →", href: ROUTES.request },
    },
  ],
} as const;

export const FOOTER = {
  brandLine:
    "Connecting people, businesses and better hospitality experiences.",
  columns: [
    {
      title: "Explore",
      links: [
        { label: "Find Jobs", href: ROUTES.jobs },
        { label: "For Businesses", href: ROUTES.business },
        { label: "Training & Services", href: ROUTES.training },
        { label: "About Us", href: ROUTES.about },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Contact", href: ROUTES.contact },
        { label: "Privacy", href: ROUTES.privacy },
        { label: "Terms", href: ROUTES.terms },
      ],
    },
    {
      title: "Connect",
      // Instagram / LinkedIn removed until Beeliv supplies the real profile URLs (no dead links on a live site).
      links: [{ label: "Email", href: PUBLIC_CONTACT_MAILTO }],
    },
  ],
  legalLeft: "© 2026 Beeliv Hospitality",
  legalRight: "Beeliv Global Resources Ltd · Abuja, Nigeria",
} as const;
