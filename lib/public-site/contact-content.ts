/**
 * Contact page copy and static structure.
 *
 * Source of truth: canvas-source\Contact-Desktop.dc.html / Contact-Mobile.dc.html
 * (re-exported 2026-09-26 20:23 - checked for anything newer before this file was
 * written). COPY.md section 6 "Contact" is STALE: it still describes an older
 * 4-option selector ("I'm hiring" / "I need training" / "I want a service
 * audit") with a Role-swaps-to-Company field. The current wireframe has been
 * deliberately simplified to a 3-option selector (work / business / something
 * else) with a fixed field list, and both boards' own inline note says
 * selecting "I'm a business" sends the visitor to the Request Talent form
 * instead - so every business lead lands in one place. The wireframe text
 * below is used verbatim over COPY.md wherever the two disagree.
 *
 * Anything in [square brackets] is a still-open item (COPY.md "Open items
 * before locking" #7: domain + street address) and is rendered visibly
 * bracketed - do not fill it in without the project lead.
 */
import { ROUTES } from "./content";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from "./contact-address";

export const CONTACT_ROUTES = {
  request: ROUTES.request,
  privacy: ROUTES.privacy,
} as const;

export const CONTACT_NAV_ACTIVE = ROUTES.contact;

export const CONTACT_HERO = {
  eyebrow: "Contact",
  titleLead: "How can we",
  titleAccent: "help?",
  /** Desktop body (wider intro). */
  bodyDesktop:
    "Whether you're looking for work, hiring, or developing your team, tell us what you need and the right person at Beeliv will get back to you.",
  /** Mobile body (shorter - the wireframe draws different text per breakpoint). */
  bodyMobile: "Tell us what you need and the right person at Beeliv will get back to you.",
} as const;

export type ContactKind = "work" | "business" | "other";

/** The "I'm..." selector. "work" is the wireframe's default-checked option. */
export const CONTACT_KIND = {
  legend: "I'm…",
  default: "work" as ContactKind,
  options: [
    { value: "work", label: "I'm looking for work" },
    { value: "business", label: "I'm a business" },
    { value: "other", label: "Something else" },
  ] as const satisfies readonly { value: ContactKind; label: string }[],
} as const;

export const CONTACT_FIELDS = {
  name: { label: "Full name" },
  email: { label: "Email" },
  phone: { label: "Phone" },
  /** Roles offered in the "Role you're looking for" dropdown; "Other" reveals a free-text field. */
  roleOptions: [
    "Waiter / Waitress",
    "Chef",
    "Cook / Kitchen assistant",
    "Bartender",
    "Barista",
    "Host / Hostess",
    "Cashier",
    "Receptionist / Front desk",
    "Supervisor",
    "Restaurant / Outlet manager",
    "Housekeeping",
    "Kitchen steward",
  ],
  roleOther: { option: "Other", label: "Tell us the role", placeholder: "e.g. Sommelier" },
  role: { label: "Role you're looking for", note: "(work only)" },
  message: { label: "Message" },
  cv: { label: "CV", note: "(work only · optional)" },
} as const;

export const CONTACT_CONSENT = {
  lead: "I agree to Beeliv storing my details to respond to this enquiry.",
  link: "Privacy",
} as const;

export const CONTACT_NAV_UI = {
  send: "Send Message →",
  sending: "Sending…",
} as const;

/** DRAFT validation / status copy - the wireframe draws no field-level messages. */
export const CONTACT_MESSAGES = {
  messageRequired: "Tell us a little about what you need.",
  failure: "We could not send your message. Please try again.",
  consentRequired: "Please agree before sending your message.",
} as const;

/**
 * Inline "sent" state copy. DRAFT: no Contact-Sent board exists in canvas-source
 * (checked directory listing - only Contact-Desktop/-Mobile and their Skel
 * boards). Request Talent has a dedicated /request/sent screen; Contact does
 * not, so this renders in place of the form rather than inventing a new route.
 * Flagged for project-lead confirmation.
 */
export const CONTACT_SENT = {
  title: "Message sent.",
  body: "Thanks - the right person at Beeliv will get back to you.",
} as const;

/** Contact details column (wireframe: aside on desktop, its own section on mobile). */
export const CONTACT_INFO = {
  email: {
    label: "Email",
    value: PUBLIC_CONTACT_EMAIL,
    href: PUBLIC_CONTACT_MAILTO,
  },
  phone: {
    label: "Phone",
    value: "+234 808 283 3989",
    href: "tel:+2348082833989",
  },
  office: {
    label: "Office",
    city: "Abuja, Nigeria",
    // OPEN ITEM (COPY.md "Open items before locking" #7): street address not
    // supplied. Desktop wireframe draws this bracketed line; mobile does not.
    address: "",
  },
  // Instagram / LinkedIn hidden until Beeliv supplies the real profile URLs (no dead links on a live site).
  socials: [] as readonly { label: string; href: string }[],
} as const;
