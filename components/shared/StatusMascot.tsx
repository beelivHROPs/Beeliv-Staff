/**
 * Small animated "avatar" for full-page status states (404 / error) —
 * project-lead direction: "an animated svg or avatar with an interesting
 * text or ux" rather than a static line-art icon like EmptyState's inline
 * illustrations (which stay as-is; those are small inline widgets, this is
 * a whole page's hero visual). Same restrained geometric-shape/no-stock-art
 * language as EmptyState, just bigger, in white/gold for the purple
 * bg-auth-glow page background, and animated via the motion utilities
 * already established in globals.css (animate-float-bob-slow for the
 * gentle bob, animate-circle-bounce for the sparkle) — no new animation
 * system introduced. Purely decorative: aria-hidden, no data.
 */
export function StatusMascot({ mood }: { mood: "lost" | "error" }) {
  return (
    <div className="animate-float-bob-slow relative" aria-hidden="true">
      <svg viewBox="0 0 160 160" width="160" height="160" fill="none" focusable="false">
        {/* Head */}
        <circle cx="80" cy="80" r="46" stroke="white" strokeWidth="3" fill="white" fillOpacity="0.08" />

        {mood === "lost" ? (
          <>
            {/* Puzzled dot eyes, one raised — a quizzical look */}
            <circle cx="64" cy="74" r="4" fill="white" />
            <circle cx="96" cy="70" r="4" fill="white" />
            {/* Confused squiggle mouth */}
            <path
              d="M62 98 Q71 104 80 98 T98 98"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            {/* Crossed-out "glitched" eyes */}
            <path d="M58 68 L70 78 M70 68 L58 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M90 68 L102 78 M102 68 L90 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
            {/* Jagged "glitch" mouth */}
            <path
              d="M60 98 L70 90 L80 100 L90 90 L100 98"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        )}
      </svg>

      {/* Gold sparkle accent — pulses via the same elastic-overshoot
          keyframe used for HeroPreviewCard's step circles, offset so it
          doesn't sync with the head's own bob. */}
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        className="animate-circle-bounce absolute top-1 right-0"
        style={{ animationDelay: "0.4s" }}
      >
        <path
          d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"
          fill="var(--gold)"
        />
      </svg>

      {/* Two small orbiting dots — purely decorative, staggered bob delays
          so the whole thing doesn't move in lockstep. */}
      <span
        className="animate-float-bob absolute -bottom-1 -left-3 size-2.5 rounded-full bg-white/70"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="animate-float-bob absolute right-3 -bottom-3 size-2 rounded-full bg-white/50"
        style={{ animationDelay: "0.7s" }}
      />
    </div>
  );
}
