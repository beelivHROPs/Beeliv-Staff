"use client";

import { useCountUp } from "@/hooks/useCountUp";

/** Renders an animated numeral — see useCountUp for the animation contract. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const animated = useCountUp(value, duration);
  return (
    <>
      {prefix}
      {animated.toFixed(decimals)}
      {suffix}
    </>
  );
}
