"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Real routes/sections only — no invented pages (no "About"/"Contact", which
// don't exist yet). "How It Works" is homepage-only content; linking to it
// as `/#how-it-works` still works from every other public page (full
// navigation to "/" then browser-native scroll-to-anchor).
const PUBLIC_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "For Businesses", href: "/#for-businesses" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Open Positions", href: "/positions" },
  { label: "FAQ", href: "/#faq" },
];

/**
 * Shared unauthenticated header for the five public recruitment-entry
 * screens (docs/architecture/ui-ux-framework.md §16). No sidebar — there is
 * no role/session yet — but now carries real top-level navigation: inline
 * links on desktop, a left-edge slide-in drawer (with a blurred backdrop,
 * closing the mobile/desktop nav-parity gap) on mobile. Reuses the same logo
 * asset/pattern as the authenticated AppShell header (components/layout/
 * AppShell.tsx), whose mobile nav is a below-header dropdown rather than a
 * drawer — kept as-is; this component only covers the public side.
 */
export function PublicHeader({
  backHref,
  backLabel,
  showLogin = true,
  glass = false,
}: {
  /** When provided, renders a "back" link to the left of the wordmark
   *  (e.g. Job Details' "Back to Open Positions"), per the §16 wireframes. */
  backHref?: string;
  backLabel?: string;
  /** Screens 04 (Apply) and 07 (Login) omit the header "Log In" link per
   *  their §16 wireframes — you're either already there or about to be. */
  showLogin?: boolean;
  /**
   * Floats the bar over its parent instead of sitting in normal document
   * flow, with a translucent/blurred surface instead of a solid one — per
   * design-system.md §4, glass is reserved for the one hero-adjacent moment
   * on the homepage, so this is only ever passed by `app/page.tsx`, over the
   * `bg-brand-wash` hero (glass needs a colorful surface behind it to read
   * as glass at all — it barely shows against a plain background, which is
   * why every other public screen keeps the default solid bar).
   */
  glass?: boolean;
}) {
  const pathname = usePathname();
  // Anchor-scroll links (/#how-it-works, /#faq) aren't distinct routes —
  // stripping their hash for comparison made them collapse to the same
  // path as Home ("/"), so Home/How It Works/FAQ all rendered "active"
  // simultaneously on the homepage (only "Open Positions", a real route,
  // was behaving correctly). Anchor links now never show as active.
  const isNavActive = (href: string) => {
    if (href.includes("#")) return false;
    return href === "/" ? pathname === "/" : pathname?.startsWith(href);
  };

  return (
    <header
      className={
        glass
          ? "absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/25 bg-white/15 px-4 py-4 shadow-sm backdrop-blur-lg backdrop-saturate-150 sm:justify-normal sm:px-6"
          : "flex items-center justify-between border-b border-border bg-card px-4 py-4 sm:justify-normal sm:px-6"
      }
    >
      {glass ? (
        // Glass "shine" — a soft bright catch along the top edge, the detail
        // that sells frosted glass as glass rather than just a translucent
        // bar. Purely decorative, sits behind the real content in DOM order.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
        />
      ) : null}

      <div className="relative flex items-center gap-2 sm:gap-4">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{backLabel ?? "Back"}</span>
          </Link>
        ) : null}
        {/* No badge here even in the `glass` variant (homepage hero) —
            project-lead direction, 2026-09-04: bg-hero-glow is a
            deliberately light tint (design-system.md §4), unlike the
            richer/more solid bg-auth-glow on the login/apply headers, so
            the logo already reads fine without one. The white-badge rule
            is specifically for richer purple surfaces, not every purple-
            adjacent one. */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/beeliv-logo-mark-v2.png"
            alt="Beeliv Hospitality"
            width={214}
            height={223}
            priority
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>
      </div>

      {/* Desktop nav — centered between logo and Log In, same layout as the
          reference site benchmarked for this session's public-site redesign
          (logo left / links center / auth actions right). Mobile gets the
          drawer above instead.
          Same dark text in both header variants — bg-hero-glow (`glass`) is
          a deliberately light/pale tint (see that class's own comment), not
          a saturated purple fill, so this header already treats itself as a
          light surface everywhere else (dark hero headline, text-primary
          Log In pill, no white logo badge needed). White nav text broke
          that and read as low-contrast/invisible — project-lead feedback. */}
      <nav aria-label="Primary" className="relative hidden flex-1 items-center justify-center gap-10 sm:flex">
        {PUBLIC_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-4 py-2 text-base font-bold transition-colors ${
              isNavActive(link.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="relative flex items-center">
        {/* Log In — desktop only now. On mobile it moves inside the drawer
            below (project-lead direction: the hamburger takes over the
            spot Log In used to sit in, not a second control competing for
            the same corner). */}
        {showLogin ? (
          // Solid purple, wider than before, and now the same on every
          // public page — project-lead: "increase its width and change
          // the color to purple" (it read as small/low-contrast white).
          // Previously this differed between the glass homepage header
          // (white pill) and every other page's plain outline button;
          // one shared solid-purple treatment reads fine against both a
          // translucent glass bar and a solid bg-card header, so the
          // split is no longer needed.
          <Link
            href="/login"
            className="mr-8 hidden items-center justify-center rounded-lg bg-primary px-6 py-2 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex sm:mr-10"
          >
            Log In
          </Link>
        ) : null}

        {/* Mobile nav — hamburger sits where Log In was on mobile, opens a
            right-edge drawer (shadcn/Base UI Sheet, sliding in from the same
            side as the trigger) with a stronger blurred backdrop than the
            primitive's default, per project-lead direction ("blur to make
            it focused"). Desktop instead gets the always-visible centered
            nav + Log In above, so this only renders below `sm:`. */}
        <Sheet>
          {/* text-primary (purple) in both variants — matches the desktop
              nav fix above; on the pale bg-hero-glow surface a white icon
              was nearly invisible (project-lead feedback). Bumped to
              size-6/h-10 from size-5/h-9 — the icon read as too thin/small
              at the old size. */}
          <SheetTrigger
            aria-label="Open navigation menu"
            className={
              glass
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-white/40 sm:hidden"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent sm:hidden"
            }
          >
            <Menu className="size-6" strokeWidth={2.25} />
          </SheetTrigger>
          <SheetContent
            side="right"
            overlayClassName="bg-black/50 backdrop-blur-sm"
            className="flex w-72 flex-col gap-0 border-border bg-card p-0"
          >
            <SheetHeader className="border-b border-border">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <Image
                src="/beeliv-logo-mark-hd.png"
                alt="Beeliv Hospitality"
                width={314}
                height={342}
                className="h-10 w-auto object-contain"
              />
            </SheetHeader>
            <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
              {PUBLIC_NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                        isNavActive(link.href)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>

            {showLogin ? (
              <SheetFooter className="mt-auto border-t border-border">
                <SheetClose
                  render={
                    <Link
                      href="/login"
                      className={buttonVariants({ className: "w-full justify-center" })}
                    />
                  }
                >
                  Log In
                </SheetClose>
              </SheetFooter>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
