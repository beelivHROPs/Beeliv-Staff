/**
 * For Businesses (/business) copy and static structure.
 *
 * Source of truth: Business-Desktop.dc.html / Business-Mobile.dc.html
 * (canvas-source, re-exported 26 Sep 2026 20:23). COPY.md's "For Businesses"
 * section predates this redesign and is NOT used - every string below is
 * taken verbatim from the wireframe boards. Anything in [square brackets] is
 * a deliberately still-open item and is rendered visibly bracketed; do not
 * fill it in without the project lead.
 *
 * NOT carried over: the wireframe's own `.tg` note after the "Business
 * problems" headline ("Researched Nigerian pain points ... confirm wording
 * with client"). That is a design-tool annotation asking the project lead to
 * confirm wording, not page copy - the same treatment the rest of this
 * codebase already gives `.tg` image-caption annotations (see SlotImage /
 * public-site.css comments). Flagged in the build report, not silently
 * dropped.
 */
import { ROUTES } from "./content";

export const BUSINESS_NAV_ACTIVE = ROUTES.business;

export const BUSINESS_HERO = {
  eyebrow: "For Businesses",
  headlineLead: "Build a team",
  headlineAccent: "worthy of your brand.",
  body: "From recruitment to workforce support, we help hospitality businesses find and develop the people behind exceptional service.",
  primaryCta: { label: "Book a Service Audit →", href: ROUTES.request },
  secondaryCta: { label: "Request Talent →", href: ROUTES.request },
} as const;

export const BUSINESS_PROBLEMS = {
  eyebrow: "The challenge",
  headlineLead: "Running hospitality in Nigeria is hard.",
  headlineAccent: "Sound familiar?",
  cards: [
    {
      title: "You train them. Then they leave.",
      body: "Staff move for small pay rises or leave the country, and the rehiring never stops.",
      tag: "→ Recruitment & HR",
    },
    {
      title: "Most of your team learned on the job.",
      body: "Few hospitality staff here are formally trained, so service changes from shift to shift.",
      tag: "→ Training",
    },
    {
      title: "The stock and the cash don't add up.",
      body: "Voided orders, over-portioning and missing stock leave you busy but not profitable.",
      tag: "→ Consulting",
    },
    {
      title: "Costs rise. Guests count every naira.",
      body: "Diesel, food prices and rent keep climbing while guests spend more carefully.",
      tag: "→ Business development",
    },
  ],
} as const;

export const PRACTICE_AREAS = {
  eyebrow: "What we offer",
  headlineLead: "Four practice areas,",
  headlineAccent: "together or one at a time.",
  body: "Take one area on its own, or combine them. Recruitment works better when the new team is trained and the systems around them hold.",
  enquire: { label: "Enquire about this →", href: ROUTES.request },
  areas: [
    {
      countLabel: "9 tracks",
      category: "Service",
      title: "Hospitality Training & Development",
      body: "Practical tracks delivered on your own floor, in your own kitchen, with your own service sequence.",
      items: [
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
    },
    {
      countLabel: "6 services",
      category: "Systems",
      title: "Restaurant & Hospitality Consulting",
      body: "From a business that hasn't opened yet to a floor that needs its standards rewritten.",
      items: [
        "Restaurant setup & launch support",
        "Standard operating procedures",
        "Service quality improvement",
        "Customer experience management",
        "Brand development",
        "Operational restructuring",
      ],
    },
    {
      countLabel: "6 services",
      category: "People",
      title: "Recruitment & HR Support",
      body: "Service-ready people, plus the structure and paperwork that keep them.",
      items: [
        "Staff recruitment & selection",
        "Employee onboarding",
        "HR documentation",
        "Performance evaluation",
        "Team structuring",
        "Payroll management",
      ],
    },
    {
      countLabel: "5 services",
      category: "Systems",
      title: "Business Development Support",
      body: "Turning a well-run business into one that keeps its tables full.",
      items: [
        "Sales & marketing strategies",
        "Customer retention systems",
        "Team productivity improvement",
        "Brand positioning",
        "Service audits & assessments",
      ],
    },
  ],
} as const;

export const BUSINESS_TIMELINE = {
  eyebrow: "How it works",
  headlineLead: "From first call to",
  headlineAccent: "lasting results.",
  body: "Four stages, run in order. Each one hands you something you can use.",
  cta: { label: "Book a Service Audit →", href: ROUTES.request },
  steps: [
    {
      num: "01",
      name: "Understand",
      text: "We visit, observe service and talk to your team to see your business as it really is.",
      getValue: "a service audit report",
    },
    {
      num: "02",
      name: "Design",
      text: "We turn what we found into a clear plan, roles and standards built around your venue.",
      getValue: "an action plan and SOPs",
    },
    {
      num: "03",
      name: "Develop",
      text: "We recruit where needed, then train and equip your team on the floor, not just in a classroom.",
      getValue: "a trained, equipped team",
    },
    {
      num: "04",
      name: "Improve",
      text: "We track service, retention and guest feedback, then fix what slips before it costs you.",
      getValue: "a performance review",
    },
  ],
} as const;

export const BUSINESS_WHY = {
  eyebrow: "Why Beeliv",
  headlineLead: "Built inside African hospitality,",
  headlineAccent: "for how it really runs.",
  reasons: [
    {
      title: "Built for African hospitality",
      body: "Practical experience from hospitality markets across Africa, not imported templates.",
    },
    {
      title: "Results you can measure",
      body: "We focus on measurable improvements in your guests' experience.",
    },
    {
      title: "Your people grow",
      body: "Staff development and business growth are built into every engagement.",
    },
    {
      title: "Shaped to your venue",
      body: "Training customised to your floor, your kitchen and your service sequence.",
    },
    {
      title: "Trainers who've done the job",
      body: "Facilitators with years of hands-on floor and kitchen experience.",
    },
    {
      title: "Support after we place",
      body: "Reliable recruitment, plus ongoing operational support.",
    },
  ],
} as const;

export const SERVICE_AUDIT_CTA = {
  headlineLead: "Start with a",
  headlineAccent: "service audit.",
  body: "A tailored review of your service, team and operations. Tell us about your venue and we will scope it with you.",
  cta: { label: "Book a Service Audit →", href: ROUTES.request },
  phoneLead: "or call",
  phone: "+234 808 283 3989",
  phoneHref: "tel:+2348082833989",
} as const;
