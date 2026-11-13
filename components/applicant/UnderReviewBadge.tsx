/**
 * "Under review" status, made to stand out (project lead, 2026-10-19): an
 * hourglass icon plus the words, inside a lavender highlight pill. Icon and
 * text together, so it is never colour-only. Presentation only.
 *
 * Animation (CSS only, see "UNDER REVIEW BADGE" in app/applicant/applicant.css):
 * sand drains over ~3.2s, the glass flips 180deg over 0.6s, repeat. Pass
 * `animate={false}` for the calm cases (second badge on a screen, filters):
 * the hourglass is then static with half sand and the glow pulse is off.
 * prefers-reduced-motion forces the static form.
 */
export type UnderReviewSize = "sm" | "md";

function Hourglass({ size }: { size: number }) {
  return (
    <svg className="ap-ur-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <g className="ap-ur-flip">
        {/* Sand (behind the glass outline): top drains, bottom fills. Point-symmetric so the flip is seamless. */}
        <path className="ap-ur-sand-top" d="M8.4 5.6h7.2c-.3 2.3-2.4 3.4-3.6 5-1.2-1.6-3.3-2.7-3.6-5Z" fill="#D8B45F" />
        <path className="ap-ur-sand-bot" d="M8.4 18.4h7.2c-.3-2.3-2.4-3.4-3.6-5-1.2 1.6-3.3 2.7-3.6 5Z" fill="#D8B45F" />
        <path className="ap-ur-stream" d="M12 10.6V17" stroke="#D8B45F" strokeWidth="1.1" strokeLinecap="round" />
        {/* Glass outline and caps */}
        <path
          d="M7 3.2h10M7 20.8h10M8 3.2v2.4c0 2.6 2.6 4 4 6.4-1.4 2.4-4 3.8-4 6.4v2.4M16 3.2v2.4c0 2.6-2.6 4-4 6.4 1.4 2.4 4 3.8 4 6.4v2.4"
          stroke="#5B087B"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function UnderReviewBadge({ size = "sm", animate = true, className = "" }: { size?: UnderReviewSize; animate?: boolean; className?: string }) {
  return (
    <span className={`ap-ur ap-ur-${size} ${animate ? "ap-ur-live" : ""} ${className}`}>
      <Hourglass size={size === "md" ? 18 : 14} />
      <span className="ap-ur-text">Under review</span>
    </span>
  );
}
