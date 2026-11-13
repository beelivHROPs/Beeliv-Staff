/**
 * Request Talent copy and static structure.
 *
 * Source of truth: the wireframes Request-Desktop / Request-Mobile /
 * Request-Sent-* (canvas-source). COPY.md has no Request section, so the
 * wireframe text is used verbatim. Anything in [square brackets] is still an
 * open item and is rendered visibly bracketed; do not fill it in without the
 * project lead.
 *
 * Copy that the wireframe does NOT draw (step 1/3/4 field labels, validation
 * messages, "Send request", "Optional") is marked DRAFT below so it is easy to
 * find and replace.
 */
import { ROUTES } from "./content";
import type { NeedId } from "./request";

export const REQUEST_ROUTES = {
  home: ROUTES.home,
  request: ROUTES.request,
  sent: `${ROUTES.request}/sent`,
  services: ROUTES.training,
  privacy: ROUTES.privacy,
} as const;

/** Nav item shown as active on both Request screens (wireframe: "For Businesses"). */
export const REQUEST_NAV_ACTIVE = ROUTES.business;

export const REQUEST_HERO = {
  eyebrow: "For Businesses",
  title: "Tell us what your business needs.",
  body: "Share a few details and a Beeliv representative will contact you to discuss your requirements.",
} as const;

export const WHAT_NEXT = {
  eyebrow: "What happens next",
  steps: [
    {
      num: "01",
      title: "We review your request",
      // OPEN ITEM: response time, bracketed exactly as in the wireframe.
      text: "The right person at Beeliv reads it, usually within 1 business day.",
    },
    {
      num: "02",
      title: "We call to scope it",
      text: "A short conversation about roles, timing and standards.",
    },
    {
      num: "03",
      title: "We send a proposal",
      text: "Clear next steps before any work begins.",
    },
  ],
  phoneLead: "Prefer to talk? Call",
  phone: "+234 808 283 3989",
  phoneHref: "tel:+2348082833989",
} as const;

export type StepNumber = 1 | 2 | 3 | 4;

/**
 * The four steps. `upcoming` is the line on the dashed "coming up" card
 * (wireframe: step 3 and 4 field lists; desktop and mobile differ slightly).
 * Step 2 has no drawn line: "Choose all that apply." (its own legend line) is
 * reused (DRAFT).
 */
export const STEPS: readonly {
  n: StepNumber;
  title: string;
  upcoming: { desktop: string; mobile: string };
}[] = [
  { n: 1, title: "Your business", upcoming: { desktop: "Business name · outlet · location", mobile: "Business name · outlet · location" } },
  { n: 2, title: "What you need", upcoming: { desktop: "Choose all that apply.", mobile: "Choose all that apply." } },
  {
    n: 3,
    title: "Your requirement",
    upcoming: {
      desktop: "Roles · headcount · location · target start date",
      mobile: "Roles · headcount · location · start date",
    },
  },
  {
    n: 4,
    title: "Contact details",
    upcoming: {
      desktop: "Name · job title · email · phone · best time to call",
      mobile: "Name · job title · email · phone",
    },
  },
];

export const STEP_COUNT = STEPS.length;

/** Step 2 cards, in wireframe order. `summary` is the short label used on later summaries. */
export const NEEDS: readonly {
  id: NeedId;
  title: string;
  sub: string;
  summary: string;
}[] = [
  { id: "recruitment", title: "Build my team", sub: "Recruitment & placement", summary: "Recruitment & placement" },
  { id: "training", title: "Train my team", sub: "Hospitality & service training", summary: "Hospitality & service training" },
  { id: "systems", title: "Strengthen my operation", sub: "HR & workforce systems", summary: "HR & workforce systems" },
  { id: "audit", title: "Book a service audit", sub: "We assess your service and operations", summary: "Service audit" },
  { id: "unsure", title: "Not sure yet", sub: "Talk it through with a Beeliv consultant", summary: "Not sure yet" },
];

export const NEED_IDS: readonly NeedId[] = NEEDS.map((n) => n.id);

/** `?need=` values Home's CTAs / other pages may pass. Others are ignored. */
export const NEED_PARAM_VALUES = ["recruitment", "training", "systems", "audit"] as const;

export const NEEDS_UI = {
  legend: "What do you need?",
  hint: "Choose all that apply.",
} as const;

/** Wireframe: "Your business", the completed-step card label, and "Edit". */
export const SUMMARY_UI = {
  edit: "Edit",
  editLabel: (title: string) => `Edit ${title.toLowerCase()}`,
} as const;

export const NAV_UI = {
  back: "← Back",
  next: "Continue →",
  /** DRAFT: the wireframe only draws "Continue →". Final-step label. */
  send: "Send request →",
  sending: "Sending…",
  privacyLead: "We'll only use your details to respond to this request.",
  privacyLink: "Privacy",
} as const;

/** DRAFT field labels, placeholders and hints (the wireframe draws no field on steps 1, 3, 4). */
export const FIELDS = {
  optional: "Optional",
  business: {
    name: { label: "Business name", placeholder: "" },
    outlet: { label: "Outlet", placeholder: "Branch or venue, if you have more than one" },
    location: { label: "Location", placeholder: "City or area" },
  },
  recruitment: {
    roles: { label: "Roles needed", placeholder: "e.g. Head chef, waiters, bar staff" },
    headcount: { label: "Headcount", placeholder: "e.g. 8" },
    location: { label: "Location", placeholder: "City or area" },
    startDate: { label: "Target start date" },
  },
  training: {
    teamSize: { label: "Team size", placeholder: "e.g. 20" },
    topics: { label: "Training topics", placeholder: "e.g. Guest service, upselling, leadership" },
  },
  details: { label: "Tell us a little more", placeholder: "" },
  contact: {
    name: { label: "Name", placeholder: "" },
    jobTitle: { label: "Job title", placeholder: "e.g. Operations manager" },
    email: { label: "Email", placeholder: "you@example.com" },
    phone: { label: "Phone", placeholder: "+234 800 000 0000" },
    bestTime: { label: "Best time to call", placeholder: "e.g. Weekdays after 2pm" },
  },
} as const;

/** DRAFT validation messages. */
export const MESSAGES = {
  businessName: "Enter your business name.",
  businessLocation: "Enter your business location.",
  needsRequired: "Choose at least one option to continue.",
  roles: "Tell us which roles you need.",
  headcount: "Enter how many people you need, as a number of 1 or more.",
  recLocation: "Enter where these roles are based.",
  startDate: "Choose today or a later date.",
  teamSize: "Enter your team size, as a number of 1 or more.",
  topics: "Tell us which topics you would like covered.",
  failure: "We could not send your request. Please try again.",
} as const;

/** Received screen (Request-Sent-*). */
export const SENT = {
  eyebrow: "Request received",
  title: "We've received your request.",
  // OPEN ITEM: response time, bracketed exactly as in the wireframe.
  body: "A Beeliv representative will contact you within 1 business day to discuss your requirements.",
  referenceLabel: "Reference",
  // OPEN ITEM: reference format. Stays bracketed until the backend issues one.
  referencePlaceholder: "Pending",
  // Shown only when there is no submitted request in this browser session (e.g.
  // the screen is opened directly): the wireframe's own bracketed sample line.
  summaryPlaceholder: "Your service request",
  backHome: "Back to home",
  services: "Explore our services",
} as const;

/** Options for the "Training topics" picker (areas from the Beeliv company profile booklet). */
export const TRAINING_TOPIC_OPTIONS = [
  "Front office",
  "Restaurant & lounge service",
  "Food & beverage service",
  "Kitchen operations",
  "Customer service excellence",
  "Leadership & team management",
  "Fine dining service",
  "POS & restaurant technology",
  "Food safety & hygiene",
] as const;
