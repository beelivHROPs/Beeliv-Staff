/**
 * Animated "application sent" mark for the submitted screen.
 *
 * Plays once (~1.5s): a paper plane flies out (sent) → the green disc pops
 * in and the check draws itself (received) → two soft rings ripple and a
 * few brand-colour sparkles burst. Keyframes live in applicant.css
 * ("Submitted mark"). Every element's resting style IS its final state, so
 * with Reduce motion (animations off) the finished check simply shows.
 */
const SPARKS: { dx: number; dy: number; color: string; shape: "dot" | "diamond"; delay: number }[] = [
  { dx: -46, dy: -30, color: "#8a0aa3", shape: "diamond", delay: 0 },
  { dx: 44, dy: -38, color: "#e0a82e", shape: "dot", delay: 40 },
  { dx: 52, dy: 18, color: "#16a34a", shape: "diamond", delay: 80 },
  { dx: -50, dy: 22, color: "#e0a82e", shape: "diamond", delay: 60 },
  { dx: -8, dy: -54, color: "#16a34a", shape: "dot", delay: 20 },
  { dx: 14, dy: 52, color: "#8a0aa3", shape: "dot", delay: 100 },
];

/** `plane={false}` + a label gives the same celebration without the "sent" plane (e.g. "Welcome to the team"). */
export function SubmittedMark({ label = "Application sent", plane = true }: { label?: string; plane?: boolean } = {}) {
  return (
    <span className="ap-sent relative block size-[132px]" role="img" aria-label={label}>
      <svg viewBox="0 0 132 132" className="size-full overflow-visible" aria-hidden="true">
        {/* ripples */}
        <circle className="ap-sent-ring" cx="66" cy="66" r="38" fill="none" stroke="#22c55e" strokeWidth="2" />
        <circle className="ap-sent-ring ap-sent-ring-2" cx="66" cy="66" r="38" fill="none" stroke="#22c55e" strokeWidth="1.5" />

        {/* disc + core */}
        <circle className="ap-sent-disc" cx="66" cy="66" r="42" fill="#dcfce7" />
        <circle className="ap-sent-core" cx="66" cy="66" r="29" fill="#16a34a" />
        <path className="ap-sent-check" d="M53 67l9 9 18-20" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />

        {/* sparkles */}
        {SPARKS.map((s, i) => (
          <g key={i} className="ap-sent-spark" style={{ ["--dx" as string]: `${s.dx}px`, ["--dy" as string]: `${s.dy}px`, animationDelay: `${780 + s.delay}ms` }}>
            {s.shape === "dot" ? (
              <circle cx="66" cy="66" r="3.2" fill={s.color} />
            ) : (
              <path d="M66 60.5l2 5.5-2 5.5-2-5.5z M60.5 66l5.5-2 5.5 2-5.5 2z" fill={s.color} />
            )}
          </g>
        ))}

        {/* paper plane: flies bottom-left → top-right, then is gone */}
        {plane ? (
        <g className="ap-sent-plane">
          <path d="M52 76 L84 60 L64 84 L62 72 Z" fill="#5b087b" />
          <path d="M62 72 L84 60" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
          <path d="M62 72 L64 84 L67 76 Z" fill="#8a0aa3" />
        </g>
        ) : null}
      </svg>
    </span>
  );
}
