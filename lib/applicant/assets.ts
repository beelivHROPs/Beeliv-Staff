/**
 * Applicant dashboard: image slot configuration.
 *
 * Mirrors the pattern in lib/public-site/assets.ts (IMAGE_SLOTS) rather than
 * reusing that file directly, since the Applicant dashboard is a distinct
 * route tree with its own asset set delivered alongside its own wireframe
 * (C:\Users\USER\Documents\beeliv-website\applicant\index.html).
 *
 * Both files below were supplied with the wireframe and copied verbatim into
 * public/images/applicant/. The wireframe's export also included a
 * "hero-cutout-male.webp" variant, wired to a client-side gender toggle
 * (`st.gender`) used only to demo the prototype with a second persona. That
 * toggle is not a documented requirement (rbac.md / requirements.md say
 * nothing about applicant-selectable avatar gender) and real profile photos
 * will eventually come from the applicant's own upload, so it was left out
 * of this build — only the single default cutout is wired here. Flagged in
 * the handback report rather than silently ported.
 */

export type ImageSlot = {
  src: string;
  alt: string;
};

export const APPLICANT_IMAGE_SLOTS = {
  /** Overview hero, desktop: cutout of a hospitality professional. */
  heroCutout: {
    src: "/images/applicant/hero-cutout.webp",
    alt: "Beeliv hospitality professional holding a tablet",
  },
  /** Sidebar promo card cutout (desktop sidebar + mobile "More" sheet). */
  sidebarCutout: {
    src: "/images/applicant/sidebar-cutout.webp",
    alt: "",
  },
} as const satisfies Record<string, ImageSlot>;

export type ApplicantImageSlotKey = keyof typeof APPLICANT_IMAGE_SLOTS;
