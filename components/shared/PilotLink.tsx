"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * A link inside running text. While the pilot menu is on and the target is a later-stage screen
 * (lib/pilot/menu.ts) it is plain text instead of a link, so help copy never points at a hidden screen.
 */
export function PilotLink({ href, children, ...rest }: ComponentProps<typeof Link>) {
  const hidden = usePilotHidden();
  if (typeof href === "string" && hidden(href)) return <>{children}</>;
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
