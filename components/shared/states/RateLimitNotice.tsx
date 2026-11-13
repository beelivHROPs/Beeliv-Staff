"use client";

import { useEffect, useRef, useState } from "react";
import "./states.css";

/** "45 seconds", "1 minute", "1 minute 30 seconds". */
export function formatWait(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const sec = `${r} second${r === 1 ? "" : "s"}`;
  const min = `${m} minute${m === 1 ? "" : "s"}`;
  if (m === 0) return sec;
  return r === 0 ? min : `${min} ${sec}`;
}

/**
 * "Too many tries. You can try again in 45 seconds."
 *
 * The countdown is COSMETIC: the server enforces the limit and supplies
 * `retryAfterSeconds`. When it reaches zero this calls `onElapsed` so the
 * parent can re-enable its control. The ticking digits are hidden from screen
 * readers; the wait is announced once on appearing and once when it ends.
 */
export function RateLimitNotice({
  retryAfterSeconds,
  onElapsed,
  message = "Too many tries.",
  className = "",
}: {
  retryAfterSeconds: number;
  onElapsed: () => void;
  message?: string;
  className?: string;
}) {
  const [left, setLeft] = useState(Math.max(1, Math.ceil(retryAfterSeconds)));
  const done = useRef(onElapsed);
  useEffect(() => {
    done.current = onElapsed;
  });

  useEffect(() => {
    // Deadline based, so a backgrounded tab catches up instead of drifting.
    const deadline = Date.now() + Math.max(1, Math.ceil(retryAfterSeconds)) * 1000;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(rem);
      if (rem === 0) {
        clearInterval(id);
        document.removeEventListener("visibilitychange", tick);
        done.current();
      }
    };
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [retryAfterSeconds]);

  return (
    <div data-tone="warn" className={`st st-card ${className}`}>
      <p className="st-text">
        <strong>{message}</strong> You can try again in{" "}
        <span aria-hidden="true" className="tabular-nums">
          {formatWait(left)}
        </span>
        <span className="sr-only">{formatWait(retryAfterSeconds)}</span>.
      </p>
      <span role="status" className="sr-only">
        {left === 0 ? "You can try again now." : ""}
      </span>
    </div>
  );
}
