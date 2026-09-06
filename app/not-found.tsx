import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusMascot } from "@/components/shared/StatusMascot";

/**
 * 404 — Not Found. Project-lead direction this session: redesign the stock
 * scaffold placeholder (gray/blue Tailwind defaults, no brand tokens at
 * all) into a real full-page moment. Uses `bg-auth-glow` (the same rich
 * purple/gold gradient as the login/apply headers — see globals.css's own
 * comment on that class) as a genuine full-page background rather than the
 * usual restrained tint, per explicit "the page color should be set to
 * purple" direction — an intentional one-off exception to the "at most one
 * hero moment per screen" rule, since this whole page IS that one moment.
 */
export default function NotFound() {
  return (
    <div className="bg-auth-glow relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:px-6">
      {/* Decorative blurred gold blobs — same technique/opacity as the
          login/apply gradient headers. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 h-72 w-72 rounded-full blur-[70px]"
          style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.3 }}
        />
        <div
          className="absolute -right-16 -bottom-24 h-80 w-80 rounded-full blur-[80px]"
          style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.28 }}
        />
      </div>

      {/* White badge behind the logo — same rule as the login/apply headers:
          this is a rich purple surface, so the logo needs the light backing
          to stay legible (design-system.md; see PublicHeader's own comment
          on when this badge does/doesn't apply). */}
      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center justify-center rounded-2xl bg-white p-3 shadow-md"
      >
        <Image
          src="/beeliv-logo-mark-hd.png"
          alt="Beeliv Hospitality"
          width={314}
          height={342}
          className="h-14 w-auto object-contain"
        />
      </Link>

      <div className="relative z-10 flex flex-col items-center">
        <StatusMascot mood="lost" />

        <span className="relative mt-2 inline-block">
          <h1 className="font-heading text-7xl leading-none font-extrabold text-white sm:text-8xl">
            404
          </h1>
          {/* Same hand-drawn animated underline technique as the homepage
              hero (app/page.tsx) — gold, pathLength-normalized so it scales
              cleanly under any width. */}
          <svg
            aria-hidden="true"
            className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-3.5"
            viewBox="0 0 120 10"
            preserveAspectRatio="none"
          >
            <path
              d="M0,6 Q7.5,1 15,6 T30,6 T45,6 T60,6 T75,6 T90,6 T105,6 T120,6"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset="100"
              className="animate-underline-draw"
            />
          </svg>
        </span>

        <h2 className="font-heading mt-5 text-xl font-semibold text-white sm:text-2xl">
          Well, this page wandered off.
        </h2>
        <p className="mt-2 max-w-sm text-sm text-white/80">
          We looked everywhere but couldn&apos;t find what you&apos;re after. It may have
          been moved, renamed, or never existed.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          {/* Explicit classes, not buttonVariants({variant:"default", ...})
              — the default variant bakes in text-primary-foreground (white),
              and tailwind-merge doesn't reliably dedupe that against an
              override className, so the text rendered invisible (white on
              white). Same fully-explicit "white pill on purple" pattern
              already used for PublicHeader's glass Log In button. */}
          <Link
            href="/"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-medium text-primary shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-white/90 hover:shadow-lg active:scale-[0.98]"
          >
            Back to Home
          </Link>
          <Link
            href="/positions"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
            })}
          >
            View Open Positions
          </Link>
        </div>
      </div>
    </div>
  );
}
