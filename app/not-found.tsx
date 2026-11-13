import type { Metadata } from "next";
import localFont from "next/font/local";
import { MotionRoot } from "@/components/public/MotionRoot";
import { NotFoundBody } from "@/components/public/NotFoundBody";
import "./(public)/public-site.css";

/**
 * Root 404 boundary. Per node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/not-found.md ("Root app/not-found handles global
 * unmatched URLs", v13.3.0+), this file is what Next.js falls back to for
 * any URL that matches no route at all (e.g. /this-does-not-exist) - nothing
 * matched, so app/(public)/layout.tsx never mounts and this can't rely on it
 * for the Newsreader font, the `.public-site` token scope or MotionRoot.
 * Each is set up locally here instead, mirroring that layout. A second
 * boundary, app/(public)/not-found.tsx, renders the same NotFoundBody for
 * `notFound()` calls thrown from *inside* the (public) tree (e.g. an
 * unknown /jobs/[id]) - that case is caught while (public)/layout.tsx is
 * still mounted, so it never falls back to this file. Both render the exact
 * same page via the shared components/public/NotFoundBody.tsx.
 *
 * Replaces the previous stock/off-wireframe design (bg-auth-glow +
 * StatusMascot — both since deleted; app/error.tsx and app/global-error.tsx
 * now show the approved 500 design). Karla/Inter stay as loaded globally by
 * app/layout.tsx.
 */
const newsreader = localFont({ src: [{ path: "./fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

export const metadata: Metadata = {
  // `absolute` (not a plain string) so this bypasses app/layout.tsx's own
  // `title.template: "%s | Beeliv"` - this file sits directly under that
  // root layout (see the doc comment above), so a plain string here would
  // get double-suffixed: "Page Not Found | Beeliv Hospitality | Beeliv".
  // Per node_modules/next/dist/docs/.../generate-metadata.md ("absolute"),
  // `title.absolute` is exactly the documented escape hatch for this.
  title: { absolute: "Page Not Found | Beeliv Hospitality" },
};

export default function NotFound() {
  return (
    <div className={`public-site ${newsreader.variable}`}>
      {/* No-JS visitors: scroll reveals start hidden in the server HTML and
          only JS reveals them, so show everything as-is. Mirrors
          app/(public)/layout.tsx's noscript fallback. */}
      <noscript>
        <style>{`.public-site [data-ps-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}.public-site [data-ps-num]{opacity:1!important}`}</style>
      </noscript>
      <MotionRoot>
        <NotFoundBody />
      </MotionRoot>
    </div>
  );
}
