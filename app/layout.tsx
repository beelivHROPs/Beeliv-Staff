import type { Metadata, Viewport } from "next";
import { Inter, Karla } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// App-wide (dashboards + everything except the new marketing site): Inter
// for headings, Karla for body — project-lead, 2026-09-16: "make sure the
// dashboards only use inter and the new body font only and no other fonts."
// Archivo/Bodoni Moda (beeliv.co's real display/logo fonts) are scoped to
// just the marketing-site draft's own layout instead (app/demo/
// marketing-site/layout.tsx), not applied here — they were briefly global
// but that pulled the dashboards off Inter too, which this reverts.
// Karla itself stays global: --font-sans had no concrete value defined
// anywhere before this (a real gap — see prior commit), so body text had
// been silently falling back to the browser default; Karla is the fix,
// independent of which heading font is active.
const interHeading = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
});
const karlaBody = Karla({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Beeliv HR/Ops",
    template: "%s | Beeliv",
  },
  description:
    "Beeliv Hospitality HR, Recruitment & Operations platform.",
};

// The app never declared it's light-only, so Android Chrome's "Force Dark"
// auto-inverts the whole page — including skeleton/shimmer loaders, which
// go from light-gray-on-white to near-black-on-black and look broken/stuck
// rather than loading (project-lead: "still tripping with the old shimmer
// loader" — a phone screenshot showing exactly this). This tells the
// browser not to auto-invert; app/globals.css's `:root` also sets the
// matching CSS `color-scheme: light` for browsers that read it directly.
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interHeading.variable} ${karlaBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
