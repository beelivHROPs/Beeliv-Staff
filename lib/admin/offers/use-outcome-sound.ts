"use client";

import { useEffect, useRef } from "react";
import { playAdminSound } from "@/lib/admin/sound";

/**
 * Sound when an offer's outcome arrives WHILE the page is open: accepted -> placement (cork pop),
 * declined -> rejected. Pass a map of offer id -> status. The first value seen for an id is only
 * remembered (never a sound on first load); a sound needs a real change from a different status.
 * The page already shows the new status chip, so the sound is never the only signal.
 */
export function useOfferOutcomeSound(statuses: Record<string, string>) {
  const seen = useRef<Record<string, string>>({});
  const key = Object.entries(statuses).map(([id, s]) => `${id}:${s}`).join("|");
  useEffect(() => {
    let sound: "placement" | "rejected" | null = null;
    for (const [id, status] of Object.entries(statuses)) {
      const before = seen.current[id];
      if (before !== undefined && before !== status) {
        if (status === "accepted") sound = "placement";
        else if (status === "declined" && sound !== "placement") sound = "rejected";
      }
      seen.current[id] = status;
    }
    if (sound) playAdminSound(sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable fingerprint of `statuses`
  }, [key]);
}
