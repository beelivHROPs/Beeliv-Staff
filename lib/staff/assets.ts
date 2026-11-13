/**
 * Staff app image slots. Every picture in the Staff app is a ROOM: a fixed
 * frame with a branded placeholder that real Beeliv art drops into. Swap the
 * paths below (or supply outlet/announcement URLs from the backend) - no
 * component changes needed.
 *
 * PLACEHOLDERS: the cutouts reuse the Applicant art until Staff photography
 * arrives. `null` means "show the branded placeholder tile".
 */
export const STAFF_ART = {
  /**
   * Staff hero cutouts (supplied 2026-09-29), rotated by HeroCarousel on
   * Home and the new-staff welcome. Transparent WebP; originals in
   * design-assets/originals/staff/. Add more paths to extend the rotation.
   */
  heroCutouts: ["/images/staff/hero-waitress.webp", "/images/staff/hero-chef.webp"],
  /** Phones only: push a picture right (px) so it clears the words. The waitress's tray is wide. */
  heroPhoneShift: { "/images/staff/hero-waitress.webp": 58 } as Record<string, number>,
  /** Sidebar / More-sheet promo art: concierge bell still life (supplied 2026-09-29, transparent). */
  promoCutout: "/images/staff/nav-concierge-bell.webp",
  /**
   * Account-state illustrations (StatusGate), supplied by the project lead.
   * null shows the empty branded room (deactivated has no art yet).
   */
  gateInvitation: "/images/staff/state-invitation-required.webp" as string | null, // invitation needed (supplied 2026-09-29)
  gateExpired: "/images/staff/state-invitation-expired.webp" as string | null, // invitation expired (supplied 2026-09-29)
  gateSuspended: "/images/staff/state-suspended.webp" as string | null, // suspended (supplied 2026-09-29)
  gateInactive: null as string | null, // deactivated
  gateNoAccess: "/images/staff/state-no-access.webp" as string | null, // no staff access yet (supplied 2026-09-29)
  /** "Need assistance?" card photo. */
  supportPhoto: null as string | null,
} as const;
