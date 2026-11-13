"use client";

/**
 * Confetti + streamer burst for the "Offer accepted" moment. Pieces shoot up
 * and out from the dialog, then drift down while spinning and fading. Pure
 * decoration: aria-hidden, no pointer events, and not rendered at all when
 * the OS or Settings > Reduce motion asks for less motion.
 */
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#5B087B", "#8A0AA3", "#C1AC75", "#E3C98A", "#B77BD1", "#FFFFFF"];

/** Small seeded generator so the burst is the same every time (no Math.random during render). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Piece = {
  kind: "rect" | "dot" | "streamer";
  color: string;
  x: number;
  up: number;
  fall: number;
  rot: number;
  size: number;
  delay: number;
  dur: number;
};

function makePieces(): Piece[] {
  const r = rng(7);
  const out: Piece[] = [];
  for (let i = 0; i < 64; i++) {
    const kind = i % 9 === 0 ? "streamer" : i % 3 === 0 ? "dot" : "rect";
    out.push({
      kind,
      color: COLORS[Math.floor(r() * COLORS.length)],
      x: (r() - 0.5) * 760,
      up: 140 + r() * 260,
      fall: 380 + r() * 360,
      rot: (r() - 0.5) * 900,
      size: kind === "streamer" ? 46 + r() * 30 : 7 + r() * 8,
      delay: r() * 0.18,
      dur: 2.2 + r() * 1.3,
    });
  }
  return out;
}

export function Celebration({ originY = "42%" }: { originY?: string }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => makePieces(), []);
  if (reduce || (typeof document !== "undefined" && document.documentElement.hasAttribute("data-ap-reduce-motion"))) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[140] overflow-hidden">
      <div className="absolute left-1/2" style={{ top: originY }}>
        {pieces.map((p, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: 0, top: 0, width: p.kind === "streamer" ? 14 : p.size, height: p.kind === "streamer" ? p.size : p.kind === "dot" ? p.size : p.size * 0.55 }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{
              x: [0, p.x * 0.7, p.x],
              y: [0, -p.up, p.fall],
              opacity: [0, 1, 1, 0],
              rotate: [0, p.rot * 0.5, p.rot],
              scale: [0.4, 1, 1],
            }}
            transition={{
              default: { duration: p.dur, delay: p.delay, ease: ["easeOut", "easeIn"], times: [0, 0.32, 1] },
              opacity: { duration: p.dur, delay: p.delay, times: [0, 0.06, 0.78, 1] },
            }}
          >
            {p.kind === "streamer" ? (
              <svg viewBox="0 0 14 60" width="14" height="100%" preserveAspectRatio="none" fill="none">
                <path d="M7 1C1 10 13 18 7 28S1 46 7 59" stroke={p.color} strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            ) : (
              <span className="block h-full w-full" style={{ background: p.color, borderRadius: p.kind === "dot" ? "50%" : 2 }} />
            )}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
