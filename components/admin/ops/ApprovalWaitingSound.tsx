"use client";

import { useOpsSummary } from "@/lib/admin/ops/hooks";
import { useIncreaseSound } from "@/lib/admin/use-increase-sound";

/**
 * Sound-only helper (renders nothing), mounted by AdminShell only while the Operations identity is active.
 * Plays the door chime once each time the number of approvals waiting for Operations goes UP while mounted.
 * The first load only sets the baseline, so there is no sound on arrival. The Approvals nav, Ops Home and the
 * approvals list already show the waiting count, so the sound is never the only signal.
 */
export function ApprovalWaitingSound() {
  const { data } = useOpsSummary();
  useIncreaseSound(data ? data.waitingSelections + data.waitingOffers : null, "approvalWaiting");
  return null;
}
