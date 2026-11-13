"use client";

import Link from "next/link";
import { usePilotHidden } from "@/lib/pilot/context";
import { BarChart3 } from "./icons";

/** Compact "View analytics" link that deep-links to the matching Analytics family with the same filters. */
export function AnalyticsLink({ href, label = "View analytics", className = "" }: { href: string; label?: string; className?: string }) {
  const hidden = usePilotHidden();
  // Pilot menu: Analytics is a later-stage screen, so its "View analytics" link is left out.
  if (hidden(href)) return null;
  return (
    <div className={`flex justify-end ${className}`}>
      <Link href={href} className="ap-btn ap-btn-q ap-btn-sm">
        <BarChart3 className="size-4" aria-hidden="true" /> {label}
      </Link>
    </div>
  );
}
