"use client";

import { useSyncExternalStore } from "react";
import "./states.css";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Browser online/offline status (true on the server so nothing flashes). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Appears only while the browser is offline. Announced politely. */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <div className="st st-offline">
          You&apos;re offline. We&apos;ll try again when you&apos;re back.
        </div>
      )}
    </div>
  );
}
