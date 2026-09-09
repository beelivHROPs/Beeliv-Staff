import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// Inter remains the body/UI face (nav, forms, tables, metrics) per the
// current implementation brief. Manrope is layered in as the dedicated
// heading face (h1/h2, PageHeading) — supersedes docs/architecture/
// design-system.md's PROPOSED Fraunces heading pairing; that doc still
// needs updating to reflect this decision.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
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
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
