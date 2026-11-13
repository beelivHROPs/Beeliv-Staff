"use client";

import { Error500Body } from "@/components/public/Error500Body";
import { MotionRoot } from "@/components/public/MotionRoot";

/** Approved 500 design; "Try again" reloads the page the person was trying to open (the URL is unchanged by the rewrite). */
export function UnavailableClient() {
  return (
    <MotionRoot>
      <Error500Body retry={() => window.location.reload()} />
    </MotionRoot>
  );
}
