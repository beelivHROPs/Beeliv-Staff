"use client";

import { useEffect } from "react";

/**
 * Deep links such as "See who is absent today" end in #records. The page loads
 * its data first, so the browser's own jump fires before the card exists; this
 * runs when the card appears and scrolls it into view (smoothly, below the top
 * bar) if the address ends in its id. Does nothing on a normal visit.
 */
export function JumpToAnchor({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [id]);
  return null;
}
