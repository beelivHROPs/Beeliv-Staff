"use client";

import { useEffect } from "react";
import { playAdminSound, type SoundName } from "./sound";

/**
 * Sound cue for a notice banner. Plays once each time a NEW message appears (`key` changes):
 * error -> error bump, ok -> saved page-turn (only when `okSound` is true; Operations approvals
 * play their own specific sound instead). Pass `kind: null` while no notice is showing.
 */
export function useNoticeSound(kind: "ok" | "error" | null, key: string, okSound = true, okName: SoundName = "saved") {
  useEffect(() => {
    if (kind === "error") playAdminSound("error");
    else if (kind === "ok" && okSound) playAdminSound(okName);
  }, [kind, key, okSound, okName]);
}
