import type { Metadata } from "next";
import localFont from "next/font/local";
import { MotionRoot } from "@/components/public/MotionRoot";
import { demoAttr } from "@/lib/dev-demo-flag";
import { ScreenScale } from "@/components/shared/ScreenScale";
import "./public-site.css";
import "./dashboard-controls.css";

// Public marketing site only: Newsreader (serif display headings) is loaded
// here and nowhere else, so the five role dashboards keep Inter headings.
// Karla (body) is already loaded globally in app/layout.tsx. Design tokens for
// this route tree are scoped to `.public-site` in ./public-site.css - the
// root tokens in app/globals.css are untouched.
const newsreader = localFont({ src: [{ path: "../fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

export const metadata: Metadata = {
  title: { default: "Beeliv Hospitality", template: "%s | Beeliv Hospitality" },
};

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div {...demoAttr()} className={`public-site ${newsreader.variable}`}>
      {/* No-JS visitors: scroll reveals start hidden (opacity 0 / clipped) in the
          server HTML and only JS reveals them, so show everything as-is. */}
      <noscript>
        <style>{`.public-site [data-ps-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}.public-site [data-ps-num]{opacity:1!important}`}</style>
      </noscript>
      <ScreenScale />
      <MotionRoot>{children}</MotionRoot>
    </div>
  );
}
