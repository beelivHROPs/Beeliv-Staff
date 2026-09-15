import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// Headline face: Plus Jakarta Sans (sans-serif). Body face: a system
// Georgia serif stack — set directly in globals.css's :root as --font-sans
// since Georgia isn't a Google Font distributable via next/font. Synced
// from the main monorepo's latest design pass.
const plusJakartaSansHeading = Plus_Jakarta_Sans({
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
      className={`${plusJakartaSansHeading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
