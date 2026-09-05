"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusMascot } from "@/components/shared/StatusMascot";

/**
 * Note: as of Next.js 16.3, the stable recovery prop on this file is `retry`
 * (not the older `reset`) — see node_modules/next/dist/docs/01-app/03-api-
 * reference/03-file-conventions/error.md, "Version History".
 *
 * Redesigned alongside not-found.tsx (same project-lead direction) — same
 * bg-auth-glow purple-page treatment, white logo badge, and StatusMascot,
 * with an "error" mood (glitched X eyes / jagged mouth) instead of "lost".
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-auth-glow relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:px-6">
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

      <div className="relative z-10 mb-8 flex items-center justify-center rounded-2xl bg-white p-3 shadow-md">
        <Image
          src="/beeliv-logo-mark-v2.png"
          alt="Beeliv Hospitality"
          width={214}
          height={223}
          className="h-14 w-auto object-contain"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <StatusMascot mood="error" />

        <h1 className="font-heading mt-5 text-2xl font-semibold text-white sm:text-3xl">
          Something went sideways.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-white/80">
          An unexpected error occurred while loading this page. You can try again, or head
          back to safety.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          {/* Plain <button> with explicit classes, not the Button component
              — same reason as not-found.tsx's Link: buttonVariants'
              default variant bakes in text-primary-foreground (white),
              which tailwind-merge doesn't reliably dedupe against an
              override className, so the label rendered invisible. */}
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-medium text-primary shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-white/90 hover:shadow-lg active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
            })}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
