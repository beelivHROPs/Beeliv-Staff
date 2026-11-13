/**
 * Public marketing site: central image / logo configuration.
 *
 * Real files have NOT been supplied yet ("we'll upload the images later").
 * Every slot below is `src: null`, which renders the wireframe's placeholder
 * block in the exact position / size / clip shape. To drop a real asset in,
 * put the file under /public/images/home/ and change that ONE `src` line, e.g.
 *
 *     heroPhoto: { src: "/images/home/hero-lounge.jpg", alt: "..." },
 *
 * Nothing else needs to change - layout, clip shapes and motion are already
 * attached to the slot, not to the image.
 */

export type ImageSlot = {
  /** Path under /public, or null while the real file is outstanding. */
  src: string | null;
  /** Descriptive alt text. Use "" for purely decorative art. */
  alt: string;
  /** CSS object-position for the cropped photo (default "center"). */
  position?: string;
};

export const IMAGE_SLOTS = {
  // Hero, desktop: full-bleed lounge photo (right side, behind cutout).
  heroPhoto: { src: "/images/hero-lounge.png", alt: "Luxury restaurant lounge interior at golden hour" },
  // Hero, desktop: woman cutout PNG, bottom anchored, breaks the white/photo edge.
  heroCutout: { src: "/images/hero-cutout.png", alt: "Smiling Beeliv hospitality professional holding a tablet" },
  // Hero, mobile: ONE composed image (woman + lounge), face top-right.
  // Superseded for the hero itself by `heroMobilePhoto` below (project-lead
  // reference-design change, confirmed twice) - kept here, unused, in case a
  // future board still wants the original composed crop.
  heroMobile: { src: null, alt: "" },
  // Hero, mobile: full-bleed hospitality/lounge photo behind the header +
  // headline + CTAs (project-lead reference screenshot, not a wireframe
  // board - see components/public/Hero.tsx HeroMobile). Portrait-ish crop,
  // no baked-in scrim (the scrim is a separate CSS gradient layer so it works
  // with any photo dropped in here later).
  heroMobilePhoto: { src: "/images/hero-mobile-photo.png", alt: "Smiling Beeliv hospitality professional in a lounge setting" },
  // 03 Brand introduction: dining table, sculptural curve.
  brandDining: { src: "/images/brand-dining.png", alt: "Elegant table setting with wine glasses at a hospitality venue" },
  // 04 Pathways.
  pathwayChef: { src: "/images/home/pathway-chef.png", alt: "Four hospitality chefs laughing together in a professional kitchen" },
  pathwayTeam: { src: "/images/home/pathway-team.png", alt: "Five smiling waitstaff in uniform standing together in a restaurant" },
  // Business-Desktop.dc.html / Business-Mobile.dc.html hero photo. The board's
  // own note says this slot reuses `pathwayTeam` ("IMG - Team / business
  // (reuse)"), but a distinct photo was supplied for this page specifically -
  // given its own slot so it no longer overwrites Home's pathway card.
  businessHero: { src: "/images/business/hero.jpg", alt: "Manager briefing three waitstaff in a restaurant dining room" },
  // 07 Featured opportunities collage (Home-Desktop-2 / Home-Mobile-2).
  jobsVenueInterior: { src: "/images/home/jobs-orchid-accent.png", alt: "" },
  jobsStaffMember: { src: "/images/home/jobs-staff-member.png", alt: "Smiling hospitality staff member in uniform holding a tablet" }, // "Smiling, service uniform, tablet"
  // Small dashed accent circle in front of the desktop collage's two photos
  // (JobsTeaser.tsx, desktop only - no equivalent on mobile).
  jobsAccentCircle: { src: "/images/home/jobs-orchid-accent.png", alt: "" },
  // 08 Training / seminar photo (Home's Training teaser section).
  training: { src: "/images/home/training-teaser.jpg", alt: "Restaurant manager briefing waitstaff at a table setting" },
  // Training-Desktop.dc.html / Training-Mobile.dc.html hero image: a wide
  // training/seminar crop, deliberately a different photo from Home's
  // `training` slot above ("Wide crop, different from homepage §07 crop.
  // Room + presenter." per the board's own annotation).
  trainingHero: { src: "/images/home/training-hero-v2.jpg", alt: "Trainer presenting to a room of hospitality staff and chefs" },
  // 09 Editorial collage.
  editorialKitchen: { src: "/images/editorial/kitchen.jpg", alt: "Chef flambéing a dish over an open flame" },
  editorialDining: { src: "/images/editorial/dining.jpg", alt: "Plated fine-dining dish with wine glasses at a table" },
  editorialWaiter: { src: "/images/editorial/waiter.jpg", alt: "Bartender pouring a cocktail at a bar" },
  // About-Desktop.dc.html / About-Mobile.dc.html "THE BEELIV STORY" photo
  // (bleeds off the left edge, mirrored sculptural curve - see .ab-sculpt-l
  // in app/(public)/about/about.css).
  aboutStory: { src: "/images/about/story.jpg", alt: "Four Beeliv team members smiling together in an office lounge" }, // "Event / hospitality (real)"
  // About "HOSPITALITY IMAGERY" / "IMAGERY" three-photo row.
  aboutDining: { src: "/images/about/dining.jpg", alt: "Waitress setting a fine-dining table with wine glasses and candles" }, // "Dining / service"
  aboutKitchen: { src: "/images/about/kitchen.jpg", alt: "Chef plating a salmon dish in a professional kitchen" }, // "Kitchen / chef"
  aboutStaff: { src: "/images/about/staff.jpg", alt: "Hospitality staff reviewing service details together on a tablet" }, // "Staff / service"
  // About "MEET OUR TEAM" portraits.
  teamGodson: { src: "/images/about/team-godson.jpg", alt: "Godson A., Beeliv team member", position: "center 15%" }, // "Godson A. portrait"
  teamBlessing: { src: "/images/about/team-blessing.jpg", alt: "Blessing A., Beeliv team member" }, // "Blessing A. portrait"
  // Auth screens, desktop brand panel (Auth-*-Desktop.dc.html): one 420 x 380
  // illustration per screen ("Beeliv illustration system", sits on Deep Plum).
  authLoginIllustration: { src: "/images/auth/login.png", alt: "" },
  authSignupIllustration: { src: "/images/auth/signup.png", alt: "" }, // "Create Account"
  // Project lead (2026-09-29): Forgot password = the "thinking, lock + ?" art;
  // the "Link Expired" art (forgot.png) belongs to expired/invalid reset links.
  authForgotIllustration: { src: "/images/auth/reset.png", alt: "" },
  authLinkExpiredIllustration: { src: "/images/auth/link-expired.webp", alt: "" }, // /reset-password expired + invalid link (supplied 2026-09-29)
  authSentIllustration: { src: "/images/auth/verify.png", alt: "" }, // "Verify Email (check your inbox)"
  // Applicant auth screens with NO wireframe board yet (derived from the Auth
  // frame): desktop = the brand panel's 420 x 380 slot; mobile = the slot where
  // the Sent/Forgot icon tile sits (the tile is the placeholder until art lands).
  authVerifyIllustration: { src: "/images/auth/verify.png", alt: "" }, // /verify-email
  authVerifiedIllustration: { src: "/images/auth/verified.png", alt: "" }, // /verify-email/success
  authResetIllustration: { src: "/images/auth/reset-new.jpg", alt: "" }, // /reset-password new-password form (supplied 2026-09-29)
  authResetSuccessIllustration: { src: "/images/auth/reset-success.png", alt: "" }, // /reset-password/success
  // Request received (Request-Sent-*.dc.html): "Success · All done" illustration.
  // 420x280 desktop, full width x 220 mobile, 28px radius. Decorative (alt "").
  requestSuccess: { src: "/images/request-success.png", alt: "" },
  // Contact-Desktop.dc.html aside: "Staff / service (optional)" photo. Desktop
  // only - Contact-Mobile.dc.html draws no image in its Contact Info section.
  // Real asset supplied is a drawn illustration (agent talking with a guest),
  // not a photo - rendered "contain" rather than cropped, see ContactShell.tsx.
  contactStaff: { src: "/images/contact-illustration.png", alt: "" },
  // 404 page illustration (no wireframe board - NotFoundBody currently draws
  // a dashed-cube icon; swap it for this once wired into the component).
  notFoundIllustration: { src: "/images/404-illustration.png", alt: "" },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotKey = keyof typeof IMAGE_SLOTS;

/** Social-proof avatar stack in the hero (desktop 4, mobile 5). */
export const HERO_AVATARS: readonly (string | null)[] = [
  "/images/avatars/avatar-1.jpg",
  "/images/avatars/avatar-2.jpg",
  "/images/avatars/avatar-3.jpg",
  "/images/avatars/avatar-4.jpg",
  "/images/avatars/avatar-5.jpg",
];

/** Beeliv logo variants. The wireframe marks all three as outstanding assets. */
export const LOGOS = {
  fullColour: { src: "/images/beeliv-logo-full-colour.png", alt: "Beeliv Hospitality", label: "Beeliv logo · full colour" },
  white: { src: "/images/beeliv-logo-white.png", alt: "Beeliv Hospitality", label: "Beeliv logo · white" },
  reversed: { src: "/images/beeliv-logo-white.png", alt: "Beeliv Hospitality", label: "Beeliv logo · reversed" },
} as const satisfies Record<
  string,
  { src: string | null; alt: string; label: string }
>;

export type LogoKey = keyof typeof LOGOS;

/**
 * Client logos for the marquee, keyed by the client name in content.ts.
 * Wireframe spec: monochrome Beeliv purple, transparent PNG/SVG.
 */
export const CLIENT_LOGOS: Record<string, string | null> = {
  "Beer Barn": "/images/clients/beer-barn.png",
  Carneval: "/images/clients/carneval.png",
  "Mar's Café": "/images/clients/mars-cafe.png",
  RÓDO: "/images/clients/rodo.png",
  "Shades Social": "/images/clients/shades-social.png",
  KALINA: "/images/clients/kalina.png",
  "Mono Liza": "/images/clients/mono-liza.png",
  "The Honeysuckle": "/images/clients/the-honeysuckle.png",
  "Uncle T's": "/images/clients/uncle-ts.png",
  "Bleu Café": "/images/clients/bleu-cafe.png",
  "Dúna Dúra": "/images/clients/duna-dura.png",
  "Eko In Abuja": "/images/clients/eko-in-abuja.png",
  iCart: "/images/clients/icart.png",
  "Emi's Cocktails": "/images/clients/emis-cocktails.png",
};
