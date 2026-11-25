"use client";

import { useState } from "react";
import { CircleAlert, RefreshCw } from "@/components/applicant/icons";
import { lastLoadFailure } from "@/lib/shared/load-failure";
import { ActionPill, StateCard } from "./kit";

const DEFAULT_TEXT = "Check your connection and try again. Nothing on your account has changed.";

/**
 * "Couldn't load" state for every Staff page (also used by Admin and Client): the shared StateCard with one
 * Try again pill (content width on desktop, full width on phones).
 *
 * The description names the specific reason when one is known (session ended, no access, not switched on yet,
 * no connection, too many attempts): `reason` when the caller passes it, otherwise the reason the data hook just
 * recorded (lib/shared/load-failure.ts). Without one, the approved wording stays.
 */
export function ErrorPanel({ title, retry, reason }: { title: string; retry: () => void; reason?: string | null }) {
  // Read once when the panel appears: it belongs to the failure that made it appear.
  const [noted] = useState(() => lastLoadFailure());
  const why = reason ?? noted;
  return (
    <StateCard
      icon={CircleAlert}
      tone="sand"
      title={title}
      text={why ? `${why} Nothing on your account has changed.` : DEFAULT_TEXT}
      action={
        <ActionPill icon={RefreshCw} variant="purple" compact arrow={false} className="w-full justify-center" onClick={retry}>
          Try again
        </ActionPill>
      }
    />
  );
}
