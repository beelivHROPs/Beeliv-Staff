/**
 * Error500-Desktop.dc.html / Error500-Mobile.dc.html copy.
 *
 * No COPY.md section exists for this screen - the wireframe boards are the
 * copy source, used verbatim (same sourcing rule as not-found-content.ts).
 * Nothing in the source boards is bracketed/TBD.
 */
import { ROUTES } from "./content";

export const ERROR_500 = {
  eyebrow: "Error 500",
  headline: "Something Went Wrong",
  body: "Oops! Something went wrong on our end. Please try again in a moment.",
  primaryCta: { label: "Go to Homepage →", href: ROUTES.home },
  retryLabel: "Try Again",
  searchLabel: "Search jobs instead",
  searchPlaceholder: "Try Chef, Waiter, Lagos",
  searchSubmit: "Search",
  stillNotWorkingLead: "Still not working?",
  stillNotWorkingCta: { label: "Let us know", href: ROUTES.contact },
  stillNotWorkingTrail: "and we'll fix it.",
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
