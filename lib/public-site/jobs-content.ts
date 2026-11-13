/**
 * Find Jobs (/jobs) copy and static structure.
 *
 * Source of truth: Jobs-Desktop / Jobs-Mobile / Jobs-Empty-Desktop /
 * Jobs-Empty-Mobile / Jobs-Filters-Mobile (canvas-source). COPY.md has no
 * dedicated Find Jobs section, so the wireframe text is used verbatim.
 * Anything in [square brackets] is still an open item and is rendered
 * visibly bracketed; do not fill it in without the project lead.
 *
 * Filter option lists (department / employment type / experience / shift /
 * benefits) are WIREFRAME-ONLY - copied from the boards' own button labels,
 * not COPY.md.
 */
import type { Department } from "./jobs";
import { ROUTES } from "./content";

export const JOBS_NAV_ACTIVE = ROUTES.jobs;

export const JOBS_HERO = {
  eyebrow: "Hospitality jobs",
  headlineLead: "Find your next",
  headlineAccent: "opportunity.",
  body: "Discover opportunities with hospitality businesses looking for people ready to grow, contribute and build meaningful careers.",
} as const;

export const JOBS_SEARCH = {
  keywordLabel: "Keyword",
  keywordPlaceholder: "Role, skill or company",
  locationAll: "All locations",
  submit: "Search",
  filtersButton: "Filters",
} as const;

/** Home-teaser style quick chips under the mobile search form. */
export const JOBS_QUICK_CHIPS: Department[] = [
  "Front of house",
  "Kitchen",
  "Bar",
  "Management",
];

export const LOCATIONS = ["Abuja", "Lagos", "Port Harcourt"] as const;

export const DEPARTMENTS: { value: Department; icon: string }[] = [
  { value: "Front of house", icon: "front-of-house" },
  { value: "Kitchen", icon: "kitchen" },
  { value: "Bar", icon: "bar" },
  { value: "Management", icon: "management" },
  { value: "Admin & operations", icon: "admin-operations" },
  { value: "Support", icon: "support" },
];

export const EMPLOYMENT_TYPES: { value: string; icon: string }[] = [
  { value: "Full-time", icon: "full-time" },
  { value: "Part-time", icon: "part-time" },
  { value: "Contract", icon: "contract" },
  { value: "Casual", icon: "casual" },
];

export const EXPERIENCE_LEVELS = ["Any", "Entry level", "1–3 years", "3–5 years", "5+ years"] as const;

export const SHIFT_PATTERNS: { value: string; icon: string }[] = [
  { value: "Day", icon: "day" },
  { value: "Evening", icon: "evening" },
  { value: "Night", icon: "night" },
  { value: "Rotating", icon: "rotating" },
];

export const BENEFITS: { value: string; icon: string }[] = [
  { value: "Accommodation provided", icon: "accommodation" },
  { value: "Transport provided", icon: "transport" },
  { value: "Meals provided", icon: "meals" },
  { value: "Flexible schedule", icon: "flexible" },
];

export const JOBS_FILTERS_UI = {
  title: "Filters",
  resetAll: "Reset all",
  clearAll: "Clear all",
  minSalary: "Min. salary",
  maxSalary: "Max. salary",
  sortLabel: "Sort",
  sortMostRecent: "Most recent",
  sortSalary: "Salary (high to low)",
  loadMore: "Load more roles",
  payPlaceholder: "[Pay, if listed]",
} as const;

export const JOBS_ALERT_CARD = {
  title: "Get job alerts",
  body: "Create a free profile and we'll tell you when roles like these open.",
  cta: { label: "Create profile →", href: ROUTES.signup },
} as const;

export const JOBS_EMPTY = {
  headlineLead: "No roles match",
  headlineAccent: "your search.",
  body: "Try a different keyword, widen the location, or clear your filters.",
  clearFilters: "Clear filters",
  browseAll: "Browse all jobs",
  popularSearchesLabel: "Popular searches",
  popularSearches: ["Waiter", "Chef", "Bartender", "Front desk"],
  alertLink: { label: "Get an alert when a matching role opens →", href: ROUTES.signup },
} as const;

export const JOBS_WHY_BEELIV = {
  eyebrow: "Why Beeliv",
  headline: "Roles worth showing up for, with people who back you.",
  reasons: [
    { title: "Vetted hospitality employers", body: "Roles come from real hospitality businesses we work with, not anonymous listings." },
    { title: "Support before and after placement", body: "We prepare you for the role, then stay in touch once you have started." },
    { title: "Grow with Beeliv training", body: "Hands-on training from people who have done the job, to build your skills on the floor." },
  ],
} as const;

export const JOBS_CANDIDATE_CTA = {
  eyebrow: "Yes, you can.",
  headline: "Looking for your next opportunity?",
  body: "Create your profile and apply to hospitality roles in minutes.",
  cta: { label: "Create your profile →", href: ROUTES.signup },
} as const;
