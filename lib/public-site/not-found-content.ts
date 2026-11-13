/**
 * NotFound-Desktop.dc.html / NotFound-Mobile.dc.html copy.
 *
 * No COPY.md section exists for this screen - the wireframe boards are the
 * copy source, used verbatim (see components/public/NotFoundBody.tsx for the
 * full sourcing note). Nothing in the source boards is bracketed/TBD.
 */
import { ROUTES } from "./content";

export const NOT_FOUND = {
  eyebrow: "Error 404",
  headline: "Page Not Found",
  body: "Oops! The page you're looking for doesn't exist or may have been moved.",
  primaryCta: { label: "Go to Homepage →", href: ROUTES.home },
  secondaryCta: { label: "Browse Vacancies", href: ROUTES.jobs },
  searchLabel: "Search jobs instead",
  searchPlaceholder: "Try Chef, Waiter, Lagos",
  searchSubmit: "Search",
  brokenLinkLead: "Followed a broken link?",
  brokenLinkCta: { label: "Let us know", href: ROUTES.contact },
  brokenLinkTrail: "and we'll fix it.",
  quickLinksEyebrow: "Quick links",
  quickLinks: [
    {
      title: "Go to Homepage",
      body: "Return to the main page",
      href: ROUTES.home,
      icon: "home",
    },
    {
      title: "Browse Vacancies",
      body: "Explore open positions",
      href: ROUTES.jobs,
      icon: "jobs",
    },
    {
      title: "Help & Support",
      body: "Get help or contact us",
      href: ROUTES.contact,
      icon: "help",
    },
    {
      title: "For Businesses",
      body: "Learn about our services",
      href: ROUTES.business,
      icon: "business",
    },
  ],
} as const;
