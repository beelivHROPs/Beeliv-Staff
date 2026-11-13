"use client";

import { useEffect, useRef } from "react";
import { playAdminSound, type SoundName } from "./sound";

/**
 * Plays `sound` once each time `count` goes UP while the component stays mounted.
 * The first real value (null / undefined mean "not loaded yet") is only remembered, so there is never a
 * sound on first load. Changing `scope` (for example another form id) starts again from a fresh baseline.
 */
export function useIncreaseSound(count: number | null | undefined, sound: SoundName, scope = "") {
  const prev = useRef<{ scope: string; count: number } | null>(null);
  useEffect(() => {
    if (count == null) return;
    const before = prev.current;
    if (before && before.scope === scope && count > before.count) playAdminSound(sound);
    prev.current = { scope, count };
  }, [count, sound, scope]);
}
